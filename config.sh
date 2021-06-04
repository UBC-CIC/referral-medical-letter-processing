AWS_CONFIG="{\
\"configLevel\":\"project\",\
\"useProfile\":true,\
\"profileName\":\"AmplifyProfile\"\
}"

FRONTEND="{\
\"frontend\":\"react\"\
}"

AMPLIFY="{\
\"envName\":\"dev\",\
\"appId\":\"d2u0qfciau3u40\",\
\"defaultEditor\":\"vscode\"\
}"

amplify pull \
--awscloudformation $AWS_CONFIG \
--frontend $FRONTEND \
--amplify $AMPLIFY \
--yes