echo "Enter your AWS account ID"
read ACCT_ID
echo "Enter name for Lambda function"
read LAMBDA_NAME
echo "Enter name for DynamoDB table"
read DYNAMO_NAME
echo "Enter AWS region"
read REGION

aws lambda delete-function --function-name $LAMBDA_NAME --region $REGION

aws iam detach-role-policy --policy-arn arn:aws:iam::aws:policy/AWSLambdaFullAccess --role-name ibd-lambda-role
aws iam detach-role-policy --policy-arn arn:aws:iam::aws:policy/AmazonTextractFullAccess --role-name ibd-lambda-role
aws iam detach-role-policy --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess --role-name ibd-lambda-role
aws iam detach-role-policy --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess --role-name ibd-lambda-role
aws iam detach-role-policy --policy-arn arn:aws:iam::aws:policy/ComprehendFullAccess --role-name ibd-lambda-role
aws iam detach-role-policy --policy-arn arn:aws:iam::aws:policy/CloudWatchFullAccess --role-name ibd-lambda-role
aws iam detach-role-policy --policy-arn arn:aws:iam::aws:policy/ComprehendMedicalFullAccess --role-name ibd-lambda-role
aws iam delete-role --role-name ibd-lambda-role

aws iam create-role --role-name ibd-lambda-role --assume-role-policy-document file://role-policy.json
aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/AWSLambdaFullAccess --role-name ibd-lambda-role
aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/AmazonTextractFullAccess --role-name ibd-lambda-role
aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess --role-name ibd-lambda-role
aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess --role-name ibd-lambda-role
aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/ComprehendFullAccess --role-name ibd-lambda-role
aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/CloudWatchFullAccess --role-name ibd-lambda-role
aws iam attach-role-policy --policy-arn arn:aws:iam::aws:policy/ComprehendMedicalFullAccess --role-name ibd-lambda-role

sleep 5

# Create Lambda Function
aws lambda create-function --function-name $LAMBDA_NAME \
                        --runtime python3.8 \
                        --memory 768 \
                        --handler index.handler \
                        --description "Convert PDF to Json summary" \
                        --timeout 150 \
                        --region $REGION \
                        --environment Variables={DYNAMO_TABLE_NAME=$DYNAMO_NAME} \
                        --role arn:aws:iam::$ACCT_ID:role/ibd-lambda-role \
                        --publish \
                        --zip-file fileb://function.zip
