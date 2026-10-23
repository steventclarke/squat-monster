Recommended setup
1. Inventory the current GoDaddy DNS records first—especially MX/email, TXT/SPF, and any portfolio A/CNAME records.
2. Create a Route 53 public hosted zone for stevenclarke.dev. AWS gives you four nameservers.
3. Recreate the required records in Route 53.
4. In GoDaddy, replace the nameservers with the four Route 53 nameservers.
5. Wait for propagation, then verify with dig NS stevenclarke.dev.
6. Create an ACM certificate in us-east-1 for iron-altar.stevenclarke.dev (or *.stevenclarke.dev), validated through Route 53.
7. Create the CloudFront distribution, then add a Route 53 A/AAAA alias for iron-altar pointing to CloudFront.
Important sequencing: delegate the domain to Route 53 before ACM validation, otherwise ACM cannot see the validation records. Also, once you change nameservers, any GoDaddy-hosted website or email records must already exist in Route 53 or they will stop resolving.
Terraform can manage the hosted zone and all records, but the GoDaddy nameserver change is a one-time manual step. Keep GoDaddy domain lock and 2FA enabled; transferring the registration to AWS is unnecessary. Route 53 costs about $0.50/month per hosted zone. .dev requires HTTPS, which CloudFront + ACM handles.
Alternative: keep DNS at GoDaddy and add a CNAME from iron-altar to CloudFront, plus ACM validation records at GoDaddy. That works, but it is less centralized—full delegation to Route 53 is better for multiple AWS-hosted apps.
The current plan assumes a Route 53 zone already exists; I can correct that and adjust the implementation sequence so the zone/delegation happens before certificate provisioning