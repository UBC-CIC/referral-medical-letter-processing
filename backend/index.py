import boto3 
import botocore  
import time 
import json
import urllib.parse
import logging 
import base64 
import os 
import glob
import re

# setup
logger = logging.getLogger()
logger.setLevel(logging.INFO)

DYNAMOTABLE= os.getenv('DYNAMO_TABLE_NAME')
comprehend_medical = boto3.client('comprehendmedical')
comprehend = boto3.client('comprehend')

# textract operations
def startJob(s3BucketName, objectName):
    response = None
    client = boto3.client('textract')
    response = client.start_document_text_detection(
    DocumentLocation={
        'S3Object': {
            'Bucket': s3BucketName,
            'Name': objectName
        }
    })
    return response["JobId"]

def isJobComplete(jobId):
    time.sleep(5)
    client = boto3.client('textract')
    response = client.get_document_text_detection(JobId=jobId)
    status = response["JobStatus"]
    logger.info(status)

    while(status == "IN_PROGRESS"):
        time.sleep(5)
        response = client.get_document_text_detection(JobId=jobId)
        status = response["JobStatus"]
        logger.info(status)

    return status

def getJobResults(jobId):
    pages = []
    time.sleep(5)
    client = boto3.client('textract')
    response = client.get_document_text_detection(JobId=jobId)
    
    pages.append(response)
    logger.info(pages)
    nextToken = None
    if('NextToken' in response):
        nextToken = response['NextToken']

    while(nextToken):
        time.sleep(5)
        response = client.get_document_text_detection(JobId=jobId, NextToken=nextToken)
        pages.append(response)
        logger.info(pages)
        logger.info(f'detecting text')
        nextToken = None
        if('NextToken' in response):
            nextToken = response['NextToken']

    return pages

# Method for obtaining string from Textract
def textExtractHelper(response):
    # Get the text blocks
    text = ""
    for index in response:
        for item in index["Blocks"]:
        # print(item)
            if item["BlockType"] == "LINE":
                # print ('\033[94m' +  item["Text"] + '\033[0m')
                text = text + " " + item["Text"]
    return text

# comprehend setup functions
def findEntities(data):
    if not data:
        return []
    try:
        result = comprehend_medical.detect_entities_v2(Text=data)
    except Exception as e:
        logger.error(e)
    return result['Entities']
def findIcd10(data):
    if not data: 
        return []
    result = comprehend_medical.infer_icd10_cm(Text=data)
    return result['Entities']
def findRx(data):
    if not data: 
        return []
    result = comprehend_medical.infer_rx_norm(Text=data)
    return result['Entities']
def findPii(data):
    # Finds PII in text, including dates and names
    if not data: 
        return []
    result = comprehend.detect_pii_entities(Text=data, LanguageCode='en')
    return result['Entities']

# handler and file processing setup
def insert_into_s3(obj, bucket, objname): 
    s3_client = boto3.client('s3')
    s3_client.put_object(Body=obj, Bucket=bucket, Key=objname)
    logger.info(f'Inserted {objname} to S3 bucket {bucket}')

def get_json_s3(bucket, key):
    s3 = boto3.resource('s3')
    content_object = s3.Object(bucket, key)
    file_content = content_object.get()['Body'].read().decode('utf-8')
    return json.loads(file_content)

def find_nth(haystack, needle, n):
    # https://stackoverflow.com/questions/1883980/find-the-nth-occurrence-of-substring-in-a-string
    start = haystack.find(needle)
    while start >= 0 and n > 1:
        start = haystack.find(needle, start+len(needle))
        n -= 1
    return start


# Added code for summary response
def process_file(text, ID):

    # Comprehend Medical and Comprehend functions and setup
    mySum = {}
    # Endoscopic Procedures (possibly store this in Django or a DB) and call as a set 
    endoscopy = {'anoscopy',
                'arthroscopy',
                'bronchoscopy',
                'colonoscopy',
                'colposcopy',
                'cystoscopy',
                'esophagoscopy',
                'gastroscopy',
                'laparoscopy',
                'laryngoscopy',
                'neuroendoscopy',
                'proctoscopy',
                'sigmoidoscopy',
                'thoracoscopy'}

    # Using these dictionaries for the summary
    #medical_conditions = {} 
    #medications = {} 
    endoscopic_procedures = []
    #negations = {}
    #problem_history = []
    page_sum = set()
    medication_instances = {}
    #jobIds = []
    #textract = boto3.client('textract')
    
    logger.info(f'{text[1:30]}')
    page_text = ""
    page_text = text

    # AWS Comprehend Medical
    entity_text = findEntities(text)
    rxnorm_text = findRx(text)
    logger.info(entity_text)
    # icd10_text = findIcd10(text) # Currently not used in implementation
    # Finding all instances of medication given to patient 
    for entity in rxnorm_text:
        if entity["Score"] >= 0.8:
            rxnorm = entity["Text"]
            for attribute in entity["Attributes"]:
                if attribute["Type"] == "DOSAGE" or attribute["Type"] == "ROUTE_OR_MODE" or attribute["Type"] == "FREQUENCY":
                    rxnorm = rxnorm + " " + attribute["Text"]
            # Store instances based off of offsets 
            key = entity["BeginOffset"]
            medication_instances[key] = rxnorm

    medical_condition = []
    current_medication = []
    time.sleep(10)

    for entity in entity_text:
        # Check if we have medication given, and then find any that have timestamps 
        if medication_instances: 
            if entity["Type"] == "TIME_TO_MEDICATION_NAME" and entity["Attributes"]: 
                for attribute in entity["Attributes"]:
                    if attribute["RelationshipType"] == "OVERLAP" and attribute["Category"] == "MEDICATION":
                        # Check if the medication is in the medication dictionary based off of offset
                        key = attribute["BeginOffset"]
                        if key in medication_instances: 
                            current_medication.append(entity["Text"] + " " + medication_instances[key])
        if entity["Score"] >= 0.8:
            # Find instances of endoscopic procedures that have time expressions 
            if entity["Category"] == "TIME_EXPRESSION" and entity["Type"] == "TIME_TO_TEST_NAME":
                for attribute in entity["Attributes"]:
                    if attribute["Category"] == "TEST_TREATMENT_PROCEDURE" and attribute["RelationshipType"] == "OVERLAP":
                        attributeText = attribute["Text"].lower()
                        if attributeText in endoscopy:
                            endoscopic_procedures.append(entity["Text"] + " " + attribute["Text"])
            # Otherwise find Diagnosis that are in the category of Medical Condition
            elif entity["Traits"]:
                for trait in entity["Traits"]:
                    if trait["Name"] == "DIAGNOSIS" and entity["Category"] == "MEDICAL_CONDITION":
                        medical_condition.append(entity["Text"].lower())
    mySum["Patient ID"] = ID
    mySum["Appointment Date"] = text[19:30]

    # Attempting to seach groups using RegEx
    #pattern1 = re.compile(r'\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)')
    pattern2 = re.compile(r'\d\) (.*?) \d\) (.*?) \d\) (.*?) \d\) (.*?) \d\) (.*?) \d\) (.*?) \d')
    try:
        page_sum = re.findall(pattern2, page_text)
        pat_sum = page_sum
        for pat in pat_sum:
            mySum["Problem History"] = pat[0]
            mySum["Lifestyle Notes"] = pat[4]
            mySum["Family History"] = pat[5]
            mySum["Extra Intestinal Manifestations"] = pat[3]
            mySum["Past Surgical History"] = pat[2]
    except Exception as e:
        raise e

    mySum["Medical condition"] = medical_condition
    mySum["Current Medication"] = current_medication
    mySum["Endoscopic Procedures"] = endoscopic_procedures

    return json.dumps(mySum)


def handler(event, context):
    logger.info(event)
    # get the bucket info 
    bucket = event['Records'][0]['s3']['bucket']['name']
    json_key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    amplify_user = json_key[find_nth(json_key,"/",1)+1:find_nth(json_key,"/",2)]
    json_content = get_json_s3(bucket, json_key)
    logger.info(f'Bucket is {bucket}')
    logger.info(f'Key for JSON is {json_key}')
    logger.info(f'Amplify User is: {amplify_user}')
    logger.info(f'Json Content is {json_content}')
    #logger.info(f'Patient ID is {int(json_content["confidence"])}')
    logger.info(f'Patient ID is {json_content["patientID"]}')
    # Get contents of JSON 
    key = json_content["key"]
    #patientID = json_content["PatientID"]
    logger.info(f'Key for file is {key}')
    #output_path = '/tmp/s3_' + key
    #file_path = '/tmp/' + key
    
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(DYNAMOTABLE)


    try:
        #get_s3_object(bucket, "protected/"+amplify_user+"/"+key, file_path)
        jobId = startJob(bucket, "protected/"+amplify_user+"/"+key)
        logger.info(f'Started job with id: {jobId}')
        if(isJobComplete(jobId)):
            response = getJobResults(jobId)
        logger.info(response)
        text = textExtractHelper(response)
        summary = process_file(text, json_content["patientID"])
        logger.info(summary)
        output_key = 'protected/'+ amplify_user + '/json/' + json_content["keyName"] + '.json'
        insert_into_s3(summary, bucket, output_key)
        table.update_item(
            Key={'id': key},
            UpdateExpression='set #status = :status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':status': 'Success'}
        )
        return {'result' : "Success", 'Output' : output_key} 
    except IndexError: 
        logger.info("Index Error")
        table.update_item(
            Key={'id': key},
            UpdateExpression='set #status = :status, #err = :err',
            ExpressionAttributeNames={'#status': 'status', '#err': 'errorMessage'},
            ExpressionAttributeValues={':status': 'Error', ':err': 'Page out of range'}
        )
        return {'result': 'Error'}
    except (botocore.exceptions.ClientError, botocore.exceptions.ParamValidationError):
        logger.info("Botocore error")
        table.update_item(
            Key={'id': key},
            UpdateExpression='set #status = :status, #err = :err',
            ExpressionAttributeNames={'#status': 'status', '#err': 'errorMessage'},
            ExpressionAttributeValues={':status': 'Error', ':err': 'AWS Botocore Error'}
        )
        return {'result': 'Error'}
    except Exception as e: 
        logger.error(e)
        table.update_item(
            Key={'id': key},
            UpdateExpression='set #status = :status, #err = :err',
            ExpressionAttributeNames={'#status': 'status', '#err': 'errorMessage'},
            ExpressionAttributeValues={':status': 'Error', ':err': 'Could not convert data'}
        )
        return {'result': 'Error'}