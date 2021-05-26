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
echo "Enter Bucket Name: "
read S3_BUCKET
echo "Enter DynamoDB table: "
read DYNAMO_TABLE

sam package --s3-bucket ${S3_BUCKET} --output-template-file out.yaml
sam deploy --template-file out.yaml --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --stack-name ibd-lambda --parameter-overrides ParameterKey=s3Bucket,ParameterValue="${S3_BUCKET}" ParameterKey=DynamoDbTable,ParameterValue="${DYNAMO_TABLE}"

sleep 5

LAMBDAARN=$(aws ssm get-parameter --name "/ibd/lambdaArn" --query Parameter.Value --output text)
#LAMBDAARN=$(aws cloudformation describe-stacks --stack-name ibd-deploy --query "Stacks[0].Outputs[?OutputKey=='PdfToJsonArn'].OutputValue" --output text)
#if [ -z "$LAMBDAARN" ]; then
#    echo 'Unable to find LAMBDA ARN'
#    exit 1
#fi
echo "Lambda: ${LAMBDAARN}"

sed "s|%LambdaArn%|$LAMBDAARN|g" notification.json > notification.s3
aws s3api put-bucket-notification-configuration --bucket "${S3_BUCKET}" --notification-configuration file://notification.s3 --output text