#!/bin/bash

BUCKET=$(aws resourcegroupstaggingapi get-resources --tag-filters Key=user:Application,Values="ibdcentre" --resource-type-filters s3 --query 'ResourceTagMappingList[0].[ResourceARN]' --output text | grep -v deployment | awk -F':::' '{print $2}')
if [ -z "$BUCKET" ]; then
    echo 'Unable to find S3 BUCKET'
    exit 1
fi
echo "Bucket Name: ${BUCKET}"

echo -e "Now creating Athena Database..."
aws athena start-query-execution --query-string file://athenaDb.sql --query-execution-context Database="default" --result-configuration OutputLocation=s3://$BUCKET/ath-output
echo -e "Creating Athena Json Table"
sed "s/<app-bucket>/${BUCKET}/" athenaTable.sql > athenaTable.json.sql
aws athena start-query-execution --query-string file://athenaTable.json.sql --query-execution-context Database="ibd_records" --result-configuration OutputLocation=s3://$BUCKET/ath-output
rm athenaTable.json.sql