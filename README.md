# jira2v1

This node script searches an Atlassian JIRA instance for defects that match your provided query and creates a task for each with appropriate descriptions and links in a specified VersionOne story. It ignores JIRA IDs that may have already been added from a previous run. Logging will note what JIRAs were added to the designated story.

Oftentimes, teams have recurring tasks that are helpful to be tracked. 

- One such is maintenance time (the time spent facilitating the work of other teams or maintaining shared code--read: "the things that you do each sprint for others that are not tracked in designated story work"). This task is automatically added, with instructions for its use. Configuration flag: `CREATE_MAINTENANCE_TASK`. To disable, set to `false`.

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
CREATE_MAINTENANCE_TASK={false or true. Default: true}
```

## Configure

* ONCE: Set the `JIRA_JQL` in the .env file to match all JIRAs you would like to have imported. This is the JIRA query statement. The resulting defects that will be copied to V1 as Tasks with links.
* EVERY SPRINT: Set the `V1_STORY_ID` in the .env file. This is the target story where all tasks will be created. This is not the S-109579 looking thingy. It's the id found in query parameter portion of the URL (immediately after the `%3A`) for the story if you open it in a new tab.


## Run

```
npm start
```

or

```
node jira2v1
```

then enjoy basking in the glow of the automatically created tasks.

## Debugging

- `DEBUG_GET_JIRAS`: Setting this to 'true' in your `.env` file will log out the processed defects that the script would attempt to create as tasks. Does not attempt to create the tasks.
- `DEBUG_PROCESSING`: Setting this to 'true' in your `.env` file will log out the fetched JIRAs versus the processed defects that the script would attempt to create as tasks. Does not attempt to create the tasks.

## Warnings

- If you attempt to run this script against a story that is closed, tasks will still be added.
