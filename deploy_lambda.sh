#!/bin/bash

if [[ ! -f "./amplify/.config/project-config.json" ]]; then
    echo 'Project file does not exist'
    exit 1
fi

PROJECT_NAME=$(cat ./amplify/.config/project-config.json | jq -r '.projectName')
if [ -z "$PROJECT_NAME" ]; then
    echo 'Unable to find PROJECT NAME'
    exit 1
fi
echo "Project Name: ${PROJECT_NAME}"

S3_BUCKET=$(aws resourcegroupstaggingapi get-resources --tag-filters Key=user:Application,Values="${PROJECT_NAME}" --resource-type-filters s3 --query 'ResourceTagMappingList[0].[ResourceARN]' --output text | grep -v deployment | awk -F':::' '{print $2}')
if [ -z "$S3_BUCKET" ]; then
    echo 'Unable to find S3 BUCKET'
    exit 1
fi
echo "Bucket Name: ${S3_BUCKET}"

DYNAMO_TABLE=$(aws resourcegroupstaggingapi get-resources --tag-filters Key=user:Application,Values="${PROJECT_NAME}" --resource-type-filters dynamodb --query 'ResourceTagMappingList[0].[ResourceARN]' --output text | cut -f2- -d/)
if [ -z "$DYNAMO_TABLE" ]; then
    echo 'Unable to find DYNAMO TABLE'
    exit 1
fi
echo "DynamoDb Table: ${DYNAMO_TABLE}"

sam build && sam package --s3-bucket ${S3_BUCKET} --output-template-file out.yaml
sam deploy -g --template-file out.yaml --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --stack-name ibd-lambda --parameter-overrides ParameterKey=s3Bucket,ParameterValue="${S3_BUCKET}" ParameterKey=DynamoDbTable,ParameterValue="${DYNAMO_TABLE}"

sleep 5

LAMBDAARN=$(aws ssm get-parameter --name "/ibd/lambdaArn" --query Parameter.Value --output text)
echo "Lambda: ${LAMBDAARN}"

sed "s|%LambdaArn%|$LAMBDAARN|g" notification.json > notification.s3
aws s3api put-bucket-notification-configuration --bucket "${S3_BUCKET}" --notification-configuration file://notification.s3 --output text
