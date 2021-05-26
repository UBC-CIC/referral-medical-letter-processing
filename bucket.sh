S3_BUCKET=$(aws resourcegroupstaggingapi get-resources --tag-filters Key=user:Application,Values="ibdcentre" --resource-type-filters s3 --query 'ResourceTagMappingList[*].[ResourceARN]' --output text | grep -v deployment | awk -F':::' '{print $2}')
if [ -z "$S3_BUCKET" ]; then
    echo 'Unable to find S3 BUCKET'
    exit 1
fi
echo "Bucket Name: ${S3_BUCKET}"