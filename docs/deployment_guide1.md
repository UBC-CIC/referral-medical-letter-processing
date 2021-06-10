# Requirements
Before you deploy, you must have the following in place:
*  [AWS Account](https://aws.amazon.com/account/) 
*  [GitHub Account](https://github.com/) 
*  [Node 10 or greater](https://nodejs.org/en/download/) 
*  [Amplify CLI 4.13.1 or greater installed and configured](https://aws-amplify.github.io/docs/cli-toolchain/quickstart#quickstart)

## Deployment steps

1.	**Clone** and **Fork** this solution repository.
2.	If you haven't configured Amplify before, configure the Amplify CLI in your terminal as follows:

```bash
amplify configure
```

3.	In a terminal from the project root directory, enter the following command selecting the IAM user of the AWS Account you will deploy this application from. (accept all defaults):

```bash
amplify init
```

4.	Next, after the Amplify project has been initialized, in your terminal again from the project root directory, enter the following command (select "Yes" for all options):

```bash
amplify push
```

This also updates the code in your local repo with the newly created amplify resource names.
5. To confirm whether Amplify successfully creates the amplify resources you can run:

```bash
amplify status
```

6.	Next, in your browser go to the AWS Amplify service page in the AWS Console. 
7.	Next, click on "Host a web app" section then click Connect branch.
8.	Select the repository that contains the fork of this project. Click Next.
9.	From the Select a backend environment dropdown, select dev (or what name is given if you follow the one touch deployment method).
10.	Next, click on the Create a new role button and accept all defaults. Now click the refresh button and select the role you just created in the dropdown menu. Click Next.
11.	Click Save and deploy.
12.	Wait until the Provision, Build, Deploy and Verify indicators are all green.