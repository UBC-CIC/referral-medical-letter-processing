import boto3 
import botocore 
from PyPDF4 import PdfFileReader, PdfFileWriter
import pdf2image 
import time 
import json
import urllib.parse
import logging 
import base64 
import os 
import glob
import re

logger = logging.getLogger()
logger.setLevel(logging.INFO)

DYNAMOTABLE= os.getenv('DYNAMO_TABLE_NAME')

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

def get_pages(pdf_path, pages, output_path):
    logger.info(f'Getting Pages {pages}')
    logger.info(f'{pdf_path} to {output_path}')
    pdf_reader = PdfFileReader(pdf_path)
    pdf_writer = PdfFileWriter()
    if not pages or pages[0] == '': 
        # if user has not specified page numbers, extract from all pages
        for page in range(pdf_reader.getNumPages()):
            write_page(pdf_reader, pdf_writer, page)
    else: 
        # otherwise process the page numbers 
        for page in pages: 
            if (page.find("-") != -1):
                # format of page_start - page_end
                pgs = page.split('-')
                logger.info(pgs)
                for pg in range(int(pgs[0]),int(pgs[1])+1):
                    write_page(pdf_reader, pdf_writer, int(pg)-1)
            else: 
                write_page(pdf_reader, pdf_writer, int(page)-1)
    with open(output_path, 'wb') as out: 
        pdf_writer.write(out)

def write_page(reader, writer, page):
    pg = reader.getPage(page)
    writer.addPage(pg)
    logger.info(f'Appending Page#{page}')

def convert_to_imgs(pdf_path):
    logger.info("Converting PDF to Images")
    with open(pdf_path, 'rb') as f: 
        content = f.read()
    logger.info(content[:1500])
    folder_path = '/tmp/'
    file_names = pdf2image.convert_from_bytes(content, dpi=500, poppler_path='poppler_binaries/', output_folder=folder_path, fmt='JPEG', paths_only=True)
    logger.info(f'PDFs are {glob.glob(folder_path+"*.pdf")}')
    logger.info(f'Images are {file_names}')
    return file_names 

# Added code for summary response
def textract_img(path_arr):
    textract = boto3.client('textract')

    # Comprehend Medical and Comprehend functions and setup
    comprehend_medical = boto3.client('comprehendmedical')
    comprehend = boto3.client('comprehend')
    myDict = {}
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
    medical_conditions = {} 
    medications = {} 
    endoscopic_procedures = []
    negations = {}
    problem_history = []
    page_sum = set()
    medication_instances = {}

    result = []
    for path in path_arr: 
        img_file = open(path, "rb")
        logger.info(f'Reading File in Path {path}')
        data = img_file.read()
        response = textract.analyze_document(
            Document={
                'Bytes': data
            },
            FeatureTypes=["TABLES"]
        )
        result.append(response)
    logger.info("Finished Textract")
    text = data
    for text in result:
        logger.info(f'{text[1:30]}')
        page_text = ""
        page_text = text

        # AWS Comprehend Medical
        entity_text = findEntities(text)
        rxnorm_text = findRx(text)
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

        # Attempting to seach groups using RegEx
        #pattern1 = re.compile(r'\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)(.*?)\d\)')
        pattern2 = re.compile(r'\d\) (.*?) \d\) (.*?) \d\) (.*?) \d\) (.*?) \d\) (.*?) \d\) (.*?) \d')
        try:
            page_sum = re.findall(pattern2, page_text)
            pat_sum = page_sum
            for pat in pat_sum:
                myDict["Problem History"] = pat[0]
                myDict["Lifestyle Notes"] = pat[4]
                myDict["Family History"] = pat[5]
                myDict["Extra Intestinal Manifestations"] = pat[3]
                myDict["Past Surgical History"] = pat[2]
        except Exception as e:
            print(e)

        myDict["Medical condition"] = medical_condition
        myDict["Current Medication"] = current_medication
        myDict["Endoscopic Procedures"] = endoscopic_procedures

    return json.dumps(myDict) 

def insert_into_s3(obj, bucket, objname): 
    s3_client = boto3.client('s3')
    s3_client.put_object(Body=obj, Bucket=bucket, Key=objname)
    logger.info(f'Inserted {objname} to S3 bucket {bucket}')

def get_s3_object(bucket, key, filename):
    s3_client = boto3.client('s3')
    try:    
        with open(filename, 'wb') as f:
            s3_client.download_fileobj(bucket, key, f)
    except Exception as e: 
        raise e 

def get_json_s3(bucket, key):
    s3 = boto3.resource('s3')
    content_object = s3.Object(bucket, key)
    file_content = content_object.get()['Body'].read().decode('utf-8')
    return json.loads(file_content)

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

def find_nth(haystack, needle, n):
    # https://stackoverflow.com/questions/1883980/find-the-nth-occurrence-of-substring-in-a-string
    start = haystack.find(needle)
    while start >= 0 and n > 1:
        start = haystack.find(needle, start+len(needle))
        n -= 1
    return start

def handler(event, context):
    logger.info(event)
    # get the bucket info 
    bucket = event['Records'][0]['s3']['bucket']['name']
    #get the file/key name
    json_key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    # Get the amplify user from the prefix 
    amplify_user = json_key[find_nth(json_key,"/",1)+1:find_nth(json_key,"/",2)]
    json_content = get_json_s3(bucket, json_key)
    logger.info(f'Bucket is {bucket}')
    logger.info(f'Key for JSON is {json_key}')
    logger.info(f'Amplify User is: {amplify_user}')
    logger.info(f'Json Content is {json_content}')
    # Get contents of JSON 
    key = json_content["key"]
    logger.info(f'Key for file is {key}')
    output_path = '/tmp/s3_' + key
    file_path = '/tmp/' + key
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(DYNAMOTABLE)
    try: 
        # Get and download the s3 object 
        get_s3_object(bucket, "protected/"+amplify_user+"/"+key, file_path)
        # Check if file is PDF or Image type (JPEG, JPG, or PNG)
        if(json_content["file_type"] == 'pdf'):
            # Get the pages specified into a new file object 
            get_pages(file_path, json_content["pages"], output_path)
            # Convert the PDF to images 
            img_arr = convert_to_imgs(output_path)
        elif(json_content["file_type"] == 'jpeg' or json_content["file_type"] == 'jpg' or json_content["file_type"] == 'png'):
            img_arr = [file_path]
        summary = textract_img(img_arr)
        #text_response = textExtractHelper(response)
        #summary = get_summary(response)
        #table_csv = get_table_csv_results(response, int(json_content["confidence"]))
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
