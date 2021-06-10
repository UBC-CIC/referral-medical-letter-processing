:: Windows
@echo off
SETLOCAL

for /f %%i in ('aws ssm get-parameter --name "/ibd/s3Bucket" --query Parameter.Value --output text') do set BUCKET=%%i
if "%BUCKET%"=="" (echo "S3 Bucket not found. Athena setup could not complete." && exit /b) else (echo S3 Bucket found: %BUCKET%)

echo Now creating Athena Database...

call aws athena start-query-execution --query-string file://athenaDb.sql --query-execution-context Database="default" --result-configuration OutputLocation=s3://%BUCKET%/ath-output

echo Creating Athena Json Table.

powershell -command "& { $content = (Get-Content 'athenaTable.sql'); $content.Replace('s3://<app-bucket>/ibd-records/', 's3://%BUCKET%/ibd-records/') | Set-Content athenaTable.json.sql}"

call aws athena start-query-execution --query-string file://athenaTable.json.sql --query-execution-context Database="ibd_records" --result-configuration OutputLocation=s3://%BUCKET%/ath-output

del athenaTable.json.sql

echo Athena setup is complete.

ENDLOCAL

exit /b