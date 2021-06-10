:: Windows
@echo off
SETLOCAL
for /f %%i in ('aws ssm get-parameter --name "/ibd/projectName" --query Parameter.Value --output text') do set PROJECT_NAME=%%i
if "%PROJECT_NAME%"=="" (echo "Amplify Project not found. Lambda deployment could not complete." && exit /b) else (echo Project found: %PROJECT_NAME%)

for /f %%i in ('aws ssm get-parameter --name "/ibd/region" --query Parameter.Value --output text') do set AWSREGION=%%i
if "%AWSREGION%"=="" (echo "AWS region not found. Lambda deployment could not complete." && exit /b) else (echo AWS Region found: %AWSREGION%)

for /f %%i in ('aws ssm get-parameter --name "/ibd/s3Bucket" --query Parameter.Value --output text') do set S3_BUCKET=%%i
if "%S3_BUCKET%"=="" (echo "S3 Bucket not found. Lambda deployment could not complete." && exit /b) else (echo S3 Bucket found: %S3_BUCKET%)

for /f %%i in ('aws ssm get-parameter --name "/ibd/dynamodb" --query Parameter.Value --output text') do set DYNAMO_TABLE=%%i
if "%DYNAMO_TABLE%"=="" (echo "DynamoDB Table not found. Lambda deployment could not complete." && exit /b) else (echo DynamoDB Table found: %DYNAMO_TABLE%)

call sam build && call sam package --s3-bucket %S3_BUCKET% --output-template-file out.yaml

timeout 5 /nobreak

call sam deploy -g --template-file out.yaml --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND --stack-name ibd-lambda --region %AWSREGION% --parameter-overrides ParameterKey=s3Bucket,ParameterValue="%S3_BUCKET%" ParameterKey=DynamoDbTable,ParameterValue="%DYNAMO_TABLE%"

timeout 5 /nobreak

for /f %%i in ('aws ssm get-parameter --name "/ibd/lambdaArn" --query Parameter.Value --output text') do set LAMBDA_ARN=%%i
if "%LAMBDA_ARN%"=="" (echo "Lambda ARN not found. Lambda deployment could not complete." && exit /b) else (echo Lambda ARN found: %LAMBDA_ARN%)

powershell -command "& { $JSON = (Get-Content 'notification.json') | ConvertFrom-Json; $JSON.LambdaFunctionConfigurations[0].LambdaFunctionArn = '%LAMBDA_ARN%'; $JSON | ConvertTo-Json -Depth 100 | Set-Content notification.s3}"

aws s3api put-bucket-notification-configuration --bucket %S3_BUCKET% --notification-configuration file://notification.s3 --output text

echo Lambda deployment is complete.
ENDLOCAL

exit /b