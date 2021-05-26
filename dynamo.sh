DYNAMO_TABLE=$(aws resourcegroupstaggingapi get-resources --tag-filters Key=user:Application,Values="ibdcentre" --resource-type-filters dynamodb --query 'ResourceTagMappingList[*].[ResourceARN]' --output text | cut -f2- -d/)
if [ -z "$DYNAMO_TABLE" ]; then
    echo 'Unable to find DYNAMO TABLE'
    exit 1
fi
echo "DynamoDb Table: ${DYNAMO_TABLE}"