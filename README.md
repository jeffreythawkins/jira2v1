# jira2v1

This node script searches an Atlassian JIRA instance for defects and creates a task for each in a VersionOne story. It ignores JIRAs that may have already been added from a previous run.

## Install

Clone this repository. In the root of the project, run:

`npm install`

The script uses the package 'dotenv' to store your username and password for both JIRA and VersionOne. Create an .env file in the script directory with the following entries:

.env

```
V1USER={username}
V1PASS={password}
JIRAUSER={username}
JIRAPASS={password}

JIRA_BASE_URI = 'http://www.yourjira.com'
JIRA_JQL = 'project = abc AND status in (open) AND type = Defect AND resolution = Unresolved'
V1_STORY_ID = 876543 (Not the S-12345 looking thing)
V1_BASE_URI = 'http://www.yourv1.com'
```

Optional Entries:

```
V1_TASK_HOURS={number of hours you would like each task to be. Default: 4}
V1_TASK_DESCRIPTION_DETAIL={short or long. Default: long}
JIRA_UNSET_PRIORITY_VALUE={Default: 6}
```

## Configure

* Change the JIRA_JQL in the .env file. This is the JIRA query statement. The resulting defects that will be copied to V1 as Tasks with links.
* Change the V1_STORY_ID in the .env file. This is the target story where all tasks will be created. This is not the S-109579 looking thingy. It's the id found in the URL for the story if you click on it.


## Run

```
npm start
```

or

```
node jira2v1
```

## Observe

Take a long draw on the beverage of your choice. Your flatmate might appreciate a comment about the lovely weather. At your leisure, inspect the taskboard, and note the recent additions.
