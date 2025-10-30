import os
import json
import urllib.request
import urllib.parse
import boto3
import botocore.exceptions
from decimal import Decimal
from datetime import datetime, timezone
import logging

# ---------- Config ----------
S3_BUCKET = "coc-api-war-history"
DDB_TABLE = os.environ.get("DDB_TABLE", "coc-api-player-war-history")

# ---------- AWS clients ----------
s3 = boto3.client("s3")
dynamodb = boto3.client("dynamodb")

# ---------- Logging ----------
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------- Helpers ----------
def _to_decimal(n):
    if n is None:
        return Decimal(0)
    if isinstance(n, Decimal):
        return n
    return Decimal(str(n))

def _normalize_clan_tag(tag: str) -> str:
    tag = tag.strip()
    if not tag:
        return tag
    if not tag.startswith("#"):
        tag = "#" + tag
    return tag.upper()

def _save_to_s3_if_new(data: dict):
    prep = data.get("preparationStartTime")
    if not prep:
        return
    key = f"{prep}.json"
    try:
        s3.head_object(Bucket=S3_BUCKET, Key=key)
        return
    except botocore.exceptions.ClientError as e:
        if e.response.get("ResponseMetadata", {}).get("HTTPStatusCode") != 404:
            raise
    s3.put_object(
        Bucket=S3_BUCKET,
        Key=key,
        Body=json.dumps(data, separators=(",", ":"), default=str),
        ContentType="application/json",
    )

def _iter_members_my_side(war: dict, my_clan_tag: str):
    apm = war.get("attacksPerMember", 0) or 0
    for side in ("clan", "opponent"):
        team = war.get(side) or {}
        if team.get("tag") == my_clan_tag:
            for m in team.get("members") or []:
                yield m, apm
            return

def _per_member_stats(member: dict):
    attacks = member.get("attacks") or []
    attacks_used = len(attacks)
    destruction_sum = sum(_to_decimal(a.get("destructionPercentage", 0)) for a in attacks)
    return attacks_used, destruction_sum

def _update_player_row(clan_tag: str, prep_id: str, member: dict, attacks_per_member: int):
    pid = member.get("tag")
    if not pid:
        return
    pname = member.get("name", "")
    th = member.get("townHallLevel") or member.get("townhallLevel") or 0
    attacks_used, destruction_sum = _per_member_stats(member)
    now_iso = datetime.now(timezone.utc).isoformat()

    expr_attr_names = {
        "#warIds": "warIds",
        "#pn": "playerName",
        "#th": "townHall",
        "#cw": "totalWars",
        "#cd": "cumDestructionPct",
        "#cu": "cumAttacksUsed",
        "#cp": "cumAttacksPossible",
        "#lu": "lastUpdated",
    }
    expr_attr_vals = {
        ":wid": {"S": prep_id},
        ":widset": {"SS": [prep_id]},
        ":zero": {"N": "0"},
        ":one": {"N": "1"},
        ":d": {"N": str(_to_decimal(destruction_sum))},
        ":au": {"N": str(_to_decimal(attacks_used))},
        ":apm": {"N": str(_to_decimal(attacks_per_member))},
        ":pnv": {"S": pname},
        ":thv": {"N": str(int(th))},
        ":now": {"S": now_iso},
    }

    update_expression = (
        "SET "
        "#pn = :pnv, "
        "#th = :thv, "
        "#cd = if_not_exists(#cd, :zero) + :d, "
        "#cu = if_not_exists(#cu, :zero) + :au, "
        "#cp = if_not_exists(#cp, :zero) + :apm, "
        "#cw = if_not_exists(#cw, :zero) + :one, "
        "#lu = :now "
        "ADD #warIds :widset"
    )

    condition_expression = "attribute_not_exists(#warIds) OR (NOT contains(#warIds, :wid))"

    try:
        dynamodb.update_item(
            TableName=DDB_TABLE,
            Key={
                "clanTag": {"S": clan_tag},  # PK from request
                "playerID": {"S": pid},      # SK from player
            },
            UpdateExpression=update_expression,
            ConditionExpression=condition_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_vals,
            ReturnValues="NONE",
        )
    except botocore.exceptions.ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            return
        logger.exception("DynamoDB update failed")
        raise

def _process_war_into_ddb(war: dict, my_clan_tag: str):
    prep = war.get("preparationStartTime")
    if not prep:
        return
    for member, apm in _iter_members_my_side(war, my_clan_tag):
        _update_player_row(my_clan_tag, prep, member, apm)

# ---------- Lambda ----------
def lambda_handler(event, context):
    api_key = os.environ.get("API_KEY")
    if not api_key:
        return {"statusCode": 500, "body": json.dumps({"error": "API_KEY not set"})}

    # API Gateway proxy (POST) expected:
    # event["body"] = '{"clanTag": "#2R999VL92"}'
    raw_body = event.get("body")
    if not raw_body:
        return {"statusCode": 400, "body": json.dumps({"error": "body required"})}

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError:
        return {"statusCode": 400, "body": json.dumps({"error": "body must be JSON"})}

    clan_tag_in = body.get("clanTag")
    if not clan_tag_in:
        return {"statusCode": 400, "body": json.dumps({"error": "clanTag required in body"})}

    clan_tag = _normalize_clan_tag(clan_tag_in)

    encoded_tag = urllib.parse.quote(clan_tag)
    url = f"https://api.clashofclans.com/v1/clans/{encoded_tag}/currentwar"
    headers = {"Authorization": f"Bearer {api_key}", "Accept": "application/json"}

    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req) as response:
            result = response.read().decode("utf-8")
            status_code = response.getcode()

        # parse and persist ONLY if war finished
        try:
            data = json.loads(result)
            state = data.get("state")
            prep = data.get("preparationStartTime")

            # use the same tag the caller asked for
            if state == "warEnded" and prep:
                _save_to_s3_if_new(data)
                _process_war_into_ddb(data, clan_tag)
            else:
                logger.info(
                    "War not ended or missing preparationStartTime. state=%s prep=%s. Skipping persistence.",
                    state,
                    prep,
                )
        except botocore.exceptions.ClientError:
            logger.exception("Persistence error (AWS)")
        except Exception:
            logger.exception("Unexpected persistence error")

        # always return what CoC returned
        return {"statusCode": status_code, "body": result}

    except urllib.error.HTTPError as e:
        return {
            "statusCode": e.code,
            "body": json.dumps({"error": e.reason, "details": e.read().decode("utf-8")}),
        }
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
