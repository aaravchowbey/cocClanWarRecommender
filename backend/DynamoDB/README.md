\# DynamoDB Configuration



\## Overview

Table Name: \*\*coc-api-player-war-history\*\*  

Billing Mode: \*\*On-Demand (PAY\_PER\_REQUEST)\*\*  

Encryption: \*\*AWS owned key (default)\*\*  

TTL: \*\*Disabled\*\*



\## Key Schema

| Attribute | Key Type       | Data Type |

|------------|----------------|------------|

| `clanTag`  | Partition Key  | String     |

| `playerID` | Sort Key       | String     |



\## Indexes

\- \*\*Global Secondary Indexes (GSI):\*\* None  

\- \*\*Local Secondary Indexes (LSI):\*\* None



\## Notes

\- Default encryption uses an AWS-owned KMS key (`aws/dynamodb`).

\- Provisioning is automatic under on-demand mode, no read/write capacity defined.

\- No TTL attribute configured.

\- CloudWatch metrics are available under `AWS/DynamoDB` namespace.



\## Sample Terraform (for documentation)

```hcl

resource "aws\_dynamodb\_table" "coc\_api\_player\_war\_history" {

&nbsp; name         = "coc-api-player-war-history"

&nbsp; billing\_mode = "PAY\_PER\_REQUEST"



&nbsp; hash\_key  = "clanTag"

&nbsp; range\_key = "playerID"



&nbsp; attribute {

&nbsp;   name = "clanTag"

&nbsp;   type = "S"

&nbsp; }



&nbsp; attribute {

&nbsp;   name = "playerID"

&nbsp;   type = "S"

&nbsp; }



&nbsp; server\_side\_encryption {

&nbsp;   enabled = true

&nbsp; }



&nbsp; tags = {

&nbsp;   Name = "coc-api-player-war-history"

&nbsp; }

}



