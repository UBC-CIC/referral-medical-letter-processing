#!/bin/bash

echo "Enter Bucket Name: ${BUCKET}"
read BUCKET

echo -e "Now creating Athena Database..."
aws athena start-query-execution --query-string file://athenaDb.sql --query-execution-context Database="default" --result-configuration OutputLocation=s3://$BUCKET/ath-output
echo -e "Creating Athena Json Table"
sed "s/<app-bucket>/${BUCKET}/" athenaTable.sql > athenaTable.json.sql
aws athena start-query-execution --query-string file://athenaTable.json.sql --query-execution-context Database="ibd_records" --result-configuration OutputLocation=s3://$BUCKET/ath-output
rm athenaTable.json.sql