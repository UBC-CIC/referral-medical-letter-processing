import boto3
import time 

class PdfProcessor: 
    def __init__(self):
        self.textract = boto3.client('textract', region_name='ca-central-1')
        self.type = 'TextDetection' # default

    def run(self, jobType, bucket, filePath):
        """
        Run a textract asynchronous operation and return the results 
        """
        if jobType == 'TextDetection': 
            self.type = 'TextDetection'
        elif jobType == 'Analysis':
            self.type = 'Analysis'
        else: 
            raise Exception("Error, invalid job type! Must be either TextDetection or Analysis")
        #print(f'Starting {self.type} Job')
        jobId = self.startJob(bucket, filePath)
        #print(f'Job ID is {jobId}')
        status = self.waitJobCompletion(jobId)
        #print(f'Status is {status} for jobId {jobId}')
        return self.getJobResults(jobId)

    def setJobType(self, jobType):
        if jobType != 'TextDetection' or jobType != 'Analysis':
            raise Exception("Error, invalid job type! Must be either TextDetection or Analysis")
        else: 
            self.type = jobType

    def startJob(self, bucket, filePath):
        if self.type == 'TextDetection':
            response = self.textract.start_document_text_detection(
                DocumentLocation={
                    'S3Object':{
                        'Bucket': bucket,
                        'Name': filePath
                    }
            })
        elif self.type == 'Analysis':
            response = self.textract.start_document_analysis(
                DocumentLocation={
                    'S3Object':{
                        'Bucket': bucket,
                        'Name': filePath
                    }
                },
                FeatureTypes=["TABLES"]
            )
        return response["JobId"]

    def waitJobCompletion(self, jobId):
        if self.type == 'TextDetection': 
            response = self.textract.get_document_text_detection(JobId=jobId)
            #print(f'-----Job Status is: {response["JobStatus"]}-----')
            while (response["JobStatus"] == 'IN_PROGRESS'):
                time.sleep(5)
                response = self.textract.get_document_text_detection(JobId=jobId)
                #print(f'-----Job Status is: {response["JobStatus"]}-----')
        
        elif self.type == 'Analysis':
            response = self.textract.get_document_analysis(JobId=jobId)
            print(f'-----Job Status is: {response["JobStatus"]}-----')
            while (response["JobStatus"] == 'IN_PROGRESS'):
                time.sleep(5)
                response = self.textract.get_document_analysis(JobId=jobId)
                #print(f'-----Job Status is: {response["JobStatus"]}-----')

        return response["JobStatus"]

    def checkJobCompletion(self, jobId):
        """
        Non-blocking method to check for the status of asynchronous Textract operation
        :jobId string: Job identifier returned by startJob method 
        :return string: Job status as IN_PROGRESS | SUCCEEDED | FAILED | PARTIAL_SUCCESS
        """
        if self.type == 'TextDetection': 
            response = self.textract.get_document_text_detection(JobId=jobId)
            #print(f'-----Job Status is: {response["JobStatus"]}-----')
            return response["JobStatus"]
        elif self.type == 'Analysis':
            response = self.textract.get_document_analysis(JobId=jobId)
            #print(f'-----Job Status is: {response["JobStatus"]}-----')
            return response["JobStatus"]


    def getJobResults(self, jobId):
        pages = []
        if self.type == 'TextDetection':
            response = self.textract.get_document_text_detection(JobId=jobId)
        elif self.type == 'Analysis': 
            response = self.textract.get_document_analysis(JobId=jobId)
        pages.append(response)
        #print(f'Result Set page recieved: {len(pages)}')
        nextToken = None
        if('NextToken' in response):
            nextToken = response['NextToken']

        while(nextToken):
            # time.sleep(1)
            if self.type == 'TextDetection':
                response = self.textract.get_document_text_detection(JobId=jobId, NextToken=nextToken)
            elif self.type == 'Analysis': 
                response = self.textract.get_document_analysis(JobId=jobId, NextToken=nextToken)
            pages.append(response)
            #print(f'Result Set page recieved: {len(pages)}')
            nextToken = None
            if('NextToken' in response):
                nextToken = response['NextToken']

        return pages
