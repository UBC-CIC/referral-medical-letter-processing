# Getting Started

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
Additionally it uses AWS Textract for synchronous text detection from PDF files and uses AWS Comprehend Medical's detect entities and find rx morm functions. Then it sends status to a DynamoDB table, stores a processed json summary file into another folder into the S3 bucket using a AWS Lambda trigger.

## Frontend Deployment

To run the project locaally, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

### `amplify init`

Initiallizes amplify and you can further run commands "amplify start", "amplify add api", "amplify add api", and "amplify add storage". Don't forget to add a lambda trigger and you can select "Yes" to all options 

### Backend Deployment

Deploy the backend application onto AWS Lambda function.

### Build Instructions 

This application requires the frontend Amplfy Application to be setup and running on the same account and region. 
1. Run the `create_lambda.bat` script for Windows machines or `create_lambda.sh` for Linux machines and follow the prompts 
2. The AWS Account ID can be found in the Account Settings in the Console. 
3. The DynamoDB table name can be found by searching DynamoDB and clicking on __Tables__. The corresponding table should start with _Status_. 
4. The region should be the same as the region you used to create the Amplify Application ie. ca-central-1. 
3. In the AWS console, navigate to the newly created lambda function
4. Click on the Add Trigger Option 

### Updates
If you make any updates to `index.py`, you must run `lambda.sh` on a machine with the same OS as Python3.8 in AWS Lambda 
    - see [here](https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html) for more information
