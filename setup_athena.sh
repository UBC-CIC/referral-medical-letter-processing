#!/bin/bash

PROJECT_NAME=$(cat ./amplify/.config/project-config.json | jq -r '.projectName')
if [ -z "$PROJECT_NAME" ]; then
    echo 'Unable to find PROJECT NAME'
    exit 1
fi
echo "Project Name: ${PROJECT_NAME}"

S3_BUCKET=$(aws resourcegroupstaggingapi get-resources --tag-filters Key=user:Application,Values="${PROJECT_NAME}" --resource-type-filters s3 --query 'ResourceTagMappingList[*].[ResourceARN]' --output text | grep -v deployment | awk -F':::' '{print $2}')
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