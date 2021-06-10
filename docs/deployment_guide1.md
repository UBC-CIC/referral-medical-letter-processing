## Frontend Deployment steps

1.	If you haven't configured Amplify before, configure the Amplify CLI in your terminal as follows:

```bash
amplify configure
```

2.	In a terminal from the project root directory, enter the following command selecting the IAM user of the AWS Account you will deploy this application from. (accept all defaults):

```bash
amplify init
```

3.	Next, after the Amplify project has been initialized, in your terminal again from the project root directory, enter the following command (select "Yes" for all options):

```bash
amplify push
```

This also updates the code in your local repo with the newly created amplify resource names.
4. To confirm whether Amplify successfully creates the amplify resources you can run:

```bash
amplify status
```

5.	Next, in your browser go to the AWS Amplify service page in the AWS Console. 
6.	Next, click on "Host a web app" section then click Connect branch.
7.	Select the repository that contains the fork of this project. Click Next.
8.	From the Select a backend environment dropdown, select dev (or what name is given if you follow the one touch deployment method).
9.	Next, click on the Create a new role button and accept all defaults. Now click the refresh button and select the role you just created in the dropdown menu. Click Next.
10.	Click Save and deploy.
11.	Wait until the Provision, Build, Deploy and Verify indicators are all green.
