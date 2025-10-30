import json
import os
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.getenv("TABLE_NAME", "coc-api-player-war-history")
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    # Get ?clanTag=... from API Gateway proxy event
    qs = event.get("queryStringParameters") or {}
    clan_tag = qs.get("clanTag")

    if not clan_tag:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "Missing required query parameter: clanTag"})
        }

    try:
        # Query by partition key only. This returns ALL items for that clanTag.
        resp = table.query(
            KeyConditionExpression=Key("clanTag").eq(clan_tag)
        )

        items = resp.get("Items", [])

        # Optional: handle pagination if there are more than 1 MB of data
        while "LastEvaluatedKey" in resp:
            resp = table.query(
                KeyConditionExpression=Key("clanTag").eq(clan_tag),
                ExclusiveStartKey=resp["LastEvaluatedKey"]
            )
            items.extend(resp.get("Items", []))

    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": "DynamoDB query failed", "detail": str(e)})
        }

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(items, default=str)
    }
