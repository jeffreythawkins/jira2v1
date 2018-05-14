# jira2v1

This node script moves matching Atlassian JIRA defects and creates a task for each on a VersionOne story. If it's run twice with the same source and target, it ignores JIRAs that have already been added as tasks.

## Install

Clone this repository. In the script directory, run: 

`npm install`

The script uses the package 'dotenv' to store your username and password for both JIRA and VersionOne. Create an .env file in the script directory. It should have these entries: 

.env
````
V1USER={username}
V1PASS={password}
JIRAUSER={username}
JIRAPASS={password}

V1_BASE_URI = 'http://www.yourv1.com'
JIRA_BASE_URI = 'http://www.yourjira.com'
STORY_ID = 876543 (Not the S-12345 looking thing)
JIRA_JQL = 'project = abc AND status in (open) and issuetype in (defect)'
````

## Configure

* Change the JIRA_JQL in the .env file. This is the JIRA query statement. The resulting defects that will be copied to V1 as Tasks with Links. 
* Change the STORY_ID in the .env file. This is the target story where all tasks will be created. This is not the S-109579 looking thingy. It's the id found in the URL for the story.


## Run 

node jira2v1

## Observe 

Take a long draw on the beverage of your choice. Your flatmate might appreciate a comment about the lovely weather.
