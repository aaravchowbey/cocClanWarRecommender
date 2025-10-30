\# VPC Configuration



\## Overview

Name: \*\*COC-API-VPC\*\*  

VPC ID: \*\*vpc-0a1d4b964f9dc9944\*\*  

IPv4 CIDR: \*\*10.0.0.0/25\*\*  

Region: \*\*us-east-1\*\*  

Account ID: \*\*891377086474\*\*



\## Subnets



| Name         | Type     | Subnet ID            | CIDR Block    | AZ           | Route Table ID         | Notes |

|---------------|----------|----------------------|---------------|---------------|------------------------|-------|

| public-one    | Public   | subnet-00c269f549f2be13f | 10.0.0.0/28  | us-east-1a   | rtb-08654418cefbc2943 | Connected to IGW |

| public-two    | Public   | subnet-0692337247f0c4978 | 10.0.0.16/28 | us-east-1b   | rtb-08a615b84585ca98b | Connected to IGW |

| private-one   | Private  | subnet-007f808eb96cfbce8 | 10.0.0.32/28 | us-east-1a   | rtb-0848c4eb3363c1756 | Uses NAT in AZ1 |

| private-two   | Private  | subnet-0b6174dd5bc78a9ac | 10.0.0.64/28 | us-east-1b   | rtb-085ed078f829a0e77 | Uses NAT in AZ2 |



Network ACL: \*\*acl-0cc887ee697f27db1\*\*



\## Gateways



| Type | Name | ID | Subnet (if applicable) | Public IP | Notes |

|------|------|----|------------------------|------------|-------|

| Internet Gateway | COC-API-Internet-Gateway | igw-0e004a41fc4c8002e | - | - | Attached to VPC |

| NAT Gateway | COC-API-nat-one | nat-08be29b3d43f0864a | subnet-00c269f549f2be13f (public-one) | 98.85.4.171 | AZ1 |

| NAT Gateway | COC-API-nat-two | nat-09ee39c48a3a84e6f | subnet-0692337247f0c4978 (public-two) | (elastic IP not listed) | AZ2 |



\## Route Tables



| Name / ID | Associated Subnet | Purpose | Routes |

|-------------|------------------|----------|---------|

| rtb-08654418cefbc2943 | public-one | Public routing | 0.0.0.0/0 → igw-0e004a41fc4c8002e |

| rtb-08a615b84585ca98b | public-two | Public routing | 0.0.0.0/0 → igw-0e004a41fc4c8002e |

| rtb-0848c4eb3363c1756 | private-one | Private routing | 0.0.0.0/0 → nat-08be29b3d43f0864a |

| rtb-085ed078f829a0e77 | private-two | Private routing | 0.0.0.0/0 → nat-09ee39c48a3a84e6f |



\## Security Groups

| Name | Type | Description |

|-------|------|-------------|

| default | Managed by VPC | Used by Lambda functions |



\## VPC Endpoints

None configured (no DynamoDB or S3 endpoints).



---



\## Example Terraform Documentation



```hcl

resource "aws\_vpc" "coc\_api\_vpc" {

&nbsp; cidr\_block           = "10.0.0.0/25"

&nbsp; enable\_dns\_support   = true

&nbsp; enable\_dns\_hostnames = true

&nbsp; tags = { Name = "COC-API-VPC" }

}



resource "aws\_internet\_gateway" "coc\_api\_igw" {

&nbsp; vpc\_id = aws\_vpc.coc\_api\_vpc.id

&nbsp; tags   = { Name = "COC-API-Internet-Gateway" }

}



\# Public subnets

resource "aws\_subnet" "public\_one" {

&nbsp; vpc\_id                  = aws\_vpc.coc\_api\_vpc.id

&nbsp; cidr\_block              = "10.0.0.0/28"

&nbsp; availability\_zone       = "us-east-1a"

&nbsp; map\_public\_ip\_on\_launch = true

&nbsp; tags = { Name = "public-one" }

}



resource "aws\_subnet" "public\_two" {

&nbsp; vpc\_id                  = aws\_vpc.coc\_api\_vpc.id

&nbsp; cidr\_block              = "10.0.0.16/28"

&nbsp; availability\_zone       = "us-east-1b"

&nbsp; map\_public\_ip\_on\_launch = true

&nbsp; tags = { Name = "public-two" }

}



\# Private subnets

resource "aws\_subnet" "private\_one" {

&nbsp; vpc\_id            = aws\_vpc.coc\_api\_vpc.id

&nbsp; cidr\_block        = "10.0.0.32/28"

&nbsp; availability\_zone = "us-east-1a"

&nbsp; tags = { Name = "private-one" }

}



resource "aws\_subnet" "private\_two" {

&nbsp; vpc\_id            = aws\_vpc.coc\_api\_vpc.id

&nbsp; cidr\_block        = "10.0.0.64/28"

&nbsp; availability\_zone = "us-east-1b"

&nbsp; tags = { Name = "private-two" }

}



\# NAT Gateways

resource "aws\_nat\_gateway" "nat\_one" {

&nbsp; subnet\_id     = aws\_subnet.public\_one.id

&nbsp; allocation\_id = "eipalloc-xxxxxx" # Replace with actual

&nbsp; tags = { Name = "COC-API-nat-one" }

}



resource "aws\_nat\_gateway" "nat\_two" {

&nbsp; subnet\_id     = aws\_subnet.public\_two.id

&nbsp; allocation\_id = "eipalloc-yyyyyy" # Replace with actual

&nbsp; tags = { Name = "COC-API-nat-two" }

}



\# Route tables and associations follow as per routing section



