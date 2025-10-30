\# API Gateway Configuration



\## Overview

Name: \*\*coc-api-clan-war-recommender\*\*  

Type: \*\*REST API\*\*  

API ID: \*\*13hfp225yh\*\*  

Stage: \*\*prod\*\*  

Custom Domain: \*\*none\*\*



\## Routes



| Path              | Method | Lambda Target                   | Description |

|-------------------|---------|----------------------------------|--------------|

| `/war-recommender` | GET     | `clanWarRecommenderAPI`          | Retrieves clan war recommendations |

| `/war-recommender` | POST    | `COC-API-War-History`            | Posts or updates clan war history  |



\## Integration Details

\- \*\*Integration Type:\*\* AWS Lambda Proxy

\- \*\*Deployment Stage:\*\* `prod`

\- \*\*Authorization:\*\* None (public access)

\- \*\*Invoke URLs:\*\*  

&nbsp; Constructed as:  



