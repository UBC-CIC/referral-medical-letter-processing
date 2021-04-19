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
from datetime import datetime
import uuid
from dateutil.parser import parse

# setup for error logging and comprehend
logger = logging.getLogger()
logger.setLevel(logging.INFO)

comprehend_medical = boto3.client('comprehendmedical')
comprehend = boto3.client('comprehend')

# global variable for pattern
flag = True

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
    result = comprehend_medical.detect_entities_v2(Text=data)
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

def delete_file(bucket, objectName):
    client = boto3.client('s3')
    client.delete_object(Bucket=bucket, Key=objectName)
    logger.info(f'Deleted {objectName} from S3 bucket {bucket}')

# Retrieving data from sentences
def getDateSentences(text):
    date_sentences = []
    sentences = text.split(". ")
    print(sentences)
    for sentence in sentences:
        words = sentence.split()
        for word in words:
            if(is_date(word)):
                date_sentences.append(sentence)
                break
    print(date_sentences)
    return date_sentences

def is_date(string, fuzzy=False):
    # https://stackoverflow.com/questions/25341945/check-if-string-has-date-any-format/
    """
    Return whether the string can be interpreted as a date.

    :param string: str, string to check for date
    :param fuzzy: bool, ignore unknown tokens in string if True
    """
    try: 
        parse(string, fuzzy=fuzzy)
        return True

    except ValueError:
        return False

# Added code for summary response
def process_file(text, ID, datedSentences):

    # Comprehend Medical and Comprehend functions and setup
    mySum = {}

    # AWS Comprehend Medical
    entity_text = findEntities(text)
    rxnorm_text = findRx(text)
    
    logger.info(entity_text)
    logger.info(rxnorm_text)
    
    # Finding all instances of medication given to patient 
    medication_instances = []
    medical_condition = []
    procedures = []
    dates = []
    
    for entity in rxnorm_text:
        if entity["Score"] >= 0.8:
            rxnorm = entity["Text"]
            for attribute in entity["Attributes"]:
                if attribute["Type"] == "DOSAGE" or attribute["Type"] == "ROUTE_OR_MODE" or attribute["Type"] == "FREQUENCY":
                    rxnorm = rxnorm + " " + attribute["Text"]
            # Store instances in a list
            medication_instances.append(rxnorm)
    logger.info(medication_instances)
    # removes duplicate medication name
    medication_instances = list(dict.fromkeys(medication_instances))
    for entity in entity_text:
        # Using in-range value to get first instance of date in letter    
        if entity["Type"] == "DATE":
            dates.append(entity["Text"])        
        if entity["Score"] >= 0.8:
            # Find instances of (endoscopic?) procedures that have time expressions 
            if entity["Category"] == "TEST_TREATMENT_PROCEDURE" and entity["Type"] == "PROCEDURE_NAME":
                procedures.append(entity["Text"].lower())
            # Otherwise find Diagnosis that are in the category of Medical Condition
            if entity["Traits"]:
                for trait in entity["Traits"]:
                    if trait["Name"] == "DIAGNOSIS" and entity["Category"] == "MEDICAL_CONDITION":
                        medical_condition.append(entity["Text"].lower())
    
    procedures = list(dict.fromkeys(procedures))
    medical_condition = list(dict.fromkeys(medical_condition))
    logger.info(medical_condition)
    logger.info(procedures) 
    
    mySum["documentCreatedDate"] = datetime.today().strftime('%Y-%b-%d')
    mySum["appointmentDate"] = dates[0]
    mySum["patientId"] = ID
    mySum["id"] = str(uuid.uuid4())    
    # Attempting to seach groups using RegEx
    #pattern1 = re.compile(r'\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)')
    pat_sum = re.findall(r'\d\) (.*?) \d\) (.*?) \d\) (.*?) \d\) (.*?) \d\) (.*?) \d\) (.*?) \d', text)
    if pat_sum:
        for pat in pat_sum:
            mySum["problemHistory"] = pat[0]
            mySum["lifestyleNotes"] = pat[4]
            mySum["familyHistory"] = pat[5]
            mySum["extraIntestinalManifestations"] = pat[3]
            mySum["pastSurgicalHistory"] = pat[2]
    else:
        flag = False
        mySum["problemHistory"] = []
        mySum["lifestyleNotes"] = []
        mySum["familyHistory"] = []
        mySum["extraIntestinalManifestations"] = []
        mySum["pastSurgicalHistory"] = []
    logger.info(flag)

    mySum["medicationInstances"] = medication_instances
    mySum["medicalConditions"] = medical_condition
    mySum["detectedProcedures"] = procedures
    mySum["datedSentences"] = datedSentences
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
    
    patientID = json_content["patientID"]
    logger.info(f'Patient ID is {patientID}')
    # Get contents of JSON  
    key = json_content["key"]
    logger.info(f'Key for file is {key}')

    #get_s3_object(bucket, "protected/"+amplify_user+"/"+key, file_path)
    jobId = startJob(bucket, "protected/"+amplify_user+"/"+key)
    logger.info(f'Started job with id: {jobId}')
    if(isJobComplete(jobId) == "SUCCEEDED"):
        response = getJobResults(jobId)
    logger.info(response)
    text = textExtractHelper(response)
    datedSentences = getDateSentences(text)
    summary = process_file(text, json_content["patientID"], datedSentences)
    logger.info(summary)
    logger.info(datedSentences)
    output_key = 'protected/'+ amplify_user + '/json/' + json_content["keyName"] + '.json'
    insert_into_s3(summary, bucket, output_key)
    delete_file(bucket, "protected/"+amplify_user+"/"+key)
