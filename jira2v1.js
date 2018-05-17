const axios = require('axios');
const dotenv = require('dotenv');
const escape = require('escape-html');

dotenv.config();

// REQUIRED .env SETTINGS
const {JIRAUSER, JIRAPASS, V1USER, V1PASS} = process.env; // Your account usernames and passwords.
axios.defaults.auth = {username: V1USER, password: V1PASS};

const JIRA_BASE_URI = process.env.JIRA_BASE_URI; // http://www.yourjira.com
const JIRA_JQL = process.env.JIRA_JQL; // 'project = abc AND status in (open) and issuetype in (defect)'
const V1_BASE_URI = process.env.V1_BASE_URI; // http://www.yourv1.com
const V1_STORY_ID = process.env.V1_STORY_ID; // 876543 (Not the S-12345 looking thing)

// VARIOUS CONSTANTS
const JIRA_MAX_RESULTS = 50;
const JIRA_DEFAULT_UNSET_PRIORITY_VALUE = 6; // Your organization's "Not Set" equivalent. Default: 6
const V1_MAX_RESULTS = 50;
const V1_DEFAULT_TASK_HOURS = 4;
const V1_DEFAULT_TASK_DESCRIPTION_DETAIL = 'long'; // Default: 'long'; Options 'short'|'long'

// OPTIONAL .env SETTINGS
const V1_TASK_HOURS = process.env.V1_TASK_HOURS || V1_DEFAULT_TASK_HOURS;
const V1_TASK_DESCRIPTION_DETAIL = process.env.V1_TASK_DETAIL || V1_DEFAULT_TASK_DESCRIPTION_DETAIL;
const JIRA_UNSET_PRIORITY_VALUE = process.env.JIRA_UNSET_PRIORITY_VALUE || JIRA_DEFAULT_UNSET_PRIORITY_VALUE;

// FULL URIs
const V1_REST_TASK_URI = V1_BASE_URI + '/rest-1.v1/Data/Task';
const V1_REST_LINK_URI = V1_BASE_URI + '/rest-1.v1/Data/Link';
const V1_QUERY_STORY_URI = V1_BASE_URI + '/query.v1/Data/Story';
const JIRA_URI = JIRA_BASE_URI + '/rest/api/2/search';

// DEBUG
const DEBUG_GET_JIRAS = (process.env.DEBUG_GET_JIRAS === 'true');
if (DEBUG_GET_JIRAS) { console.log(`Debugging: DEBUG_GET_JIRAS`); }

// MAIN
getJiraDefects().then(defects => {
  if (DEBUG_GET_JIRAS) {
    defects.map((defect) => {
      console.log(defect.title);
    });
    return;
  }

  if (defects.length > 0) {
    createV1TasksFromDefects(defects).then(tasks => {
      if (tasks.length > 0) {
        tasks.map((task) => {
          if (task) {
            console.log(task);
          }
        });
      } else {
        console.log(`The ${defects.length} defects that match your search criteria have already been added.\n`);
      }
    });
  } else {
    console.log(`There are no defects that match your search criteria.\n${JIRA_JQL}\n`);
  }
});

//
// FUNCTIONS
//

async function getJiraDefects () {
  let requestBody = createJiraSearchRequestBody();
  try {
    let response = await axios.post(JIRA_URI, requestBody, {auth: {username: JIRAUSER, password: JIRAPASS}});
    return response.data.issues.map(transformDefect);
  } catch (err) {
    console.log('Error in getJiraDefects: ' + err);
    return [];
  }
}

function createJiraSearchRequestBody () {
  return {
    'jql': JIRA_JQL,
    'startAt': 0,
    'maxResults': JIRA_MAX_RESULTS,
    'fields': [
      'id',
      'key',
      'summary',
      'priority',
      'labels',
      'assignee',
      'reporter',
      'description'
    ]
  };
}

function transformDefect (defect) {
  let key = defect.key;
  let url = JIRA_BASE_URI + `/browse/${defect.key}`;
  let link = createHTMLLink(url, url);
  let priority = (defect.fields.priority && defect.fields.priority.id) ? parseInt(defect.fields.priority.id, 10) : '?';

  if (typeof priority !== 'number' || priority >= JIRA_UNSET_PRIORITY_VALUE) {
    priority = '?';
  }

  let title = `P${priority} - ${defect.key} - ${escape(defect.fields.summary)}`;
  let description;

  if (V1_TASK_DESCRIPTION_DETAIL === 'short') {
    description = [
      `URL: ${link}`,
      `Assignee: ${defect.fields.assignee.displayName}`,
      `Description:`,
      `<![CDATA[${escape(defect.fields.description)}]]>`
    ].join(`<![CDATA[<br/>]]>`);
  } else {
    description = [
      `Key: ${defect.key}`,
      `Summary: ${escape(defect.fields.summary)}`,
      `Priority: ${defect.fields.priority.name}`,
      `Labels: ${defect.fields.labels}`,
      `Assignee: ${defect.fields.assignee.displayName}`,
      `Reporter: ${defect.fields.reporter.displayName}`,
      `URL: ${link}`,
      `Description:`,
      `<![CDATA[${escape(defect.fields.description)}]]>`
    ].join(`<![CDATA[<br/>]]>`);
  }
  return {key, url, title, description};
}

function createHTMLLink (href, text) {
  return `<![CDATA[<a href=${href}>${text}</a>]]>`;
}

async function createV1TasksFromDefects (defects) {
  try {
    defects = await filterOutPreviouslyProcessedDefects(defects);
    if (defects.length === 0) { return {}; }

    const allPromises = defects.map(createNewV1Task);
    let tasks = await Promise.all(allPromises);
    return tasks;
  } catch (err) {
    console.log('Error in createV1TasksFromDefects: ' + err);
  }
}

async function filterOutPreviouslyProcessedDefects (defects) {
  try {
    let searchRequestBody = createV1FindTasksInStoryRequestBody();
    const response = await axios.post(V1_QUERY_STORY_URI, searchRequestBody);
    let tasks = response.data[0];

    defects = applyFilter(defects, tasks);

    return defects;
  } catch (err) {
    console.log('Error in filterOutPreviouslyProcessedDefects: ' + err);
    return [];
  }
}

function createV1FindTasksInStoryRequestBody () {
  return {
    'from': 'Task',
    'select': [
      'Number',
      'Name'
    ],
    'where': {
      'Parent.ID': 'Story:' + V1_STORY_ID
    },
    'page': {
      'start': 0,
      'size': V1_MAX_RESULTS
    }
  };
}

function applyFilter (defects, tasks) {
  return defects.filter(defect => !tasks.some(task => task.Name.includes(defect.key)));
}

async function createNewV1Task (defect) {
  try {
    let taskRequestBody = createNewV1TaskRequestBody(defect);
    const taskResponse = await axios.post(V1_REST_TASK_URI, taskRequestBody);
    let taskId = taskResponse.data.id;
    taskId = taskId.split(':')[1];

    const linkId = await createNewV1Link(defect, taskId);

    return `${taskId}: ${defect.title}`;
  } catch (err) {
    console.log('Error in createNewV1Task ' + err);
  }
}

function createNewV1TaskRequestBody (defect) {
  return [
    `<Asset href="/rest-1.v1/New/Task">`,
    `<Attribute name="Name" act="set">${defect.title}</Attribute>`,
    `<Attribute name="Description" act="set">${defect.description}</Attribute>`,
    `<Attribute name="ToDo" act="set">${V1_TASK_HOURS}</Attribute>`,
    `<Attribute name="DetailEstimate" act="set">${V1_TASK_HOURS}</Attribute>`,
    `<Relation name="Parent" act="set">`,
    `<Asset href="/rest-1.v1/Data/Story/${V1_STORY_ID}" idref="Story:${V1_STORY_ID}" />`,
    `</Relation>`,
    `</Asset>`
  ].join('');
}

async function createNewV1Link (defect, taskId) {
  try {
    let linkRequestBody = createNewV1LinkRequestBody('JIRA', defect.url, taskId);
    let linkResponse = await axios.post(V1_REST_LINK_URI, linkRequestBody);
    let linkId = linkResponse.data.id;
    linkId = linkId.split(':')[1];
    return linkId;
  } catch (err) {
    console.log('Error in createNewV1Link ' + err);
  }
}

function createNewV1LinkRequestBody (name, url, taskId) {
  return [
    `<Asset href="/rest-1.v1/New/Link">`,
    `<Attribute name="OnMenu" act="set">true</Attribute>`,
    `<Attribute name="URL" act="set">${url}</Attribute>`,
    `<Attribute name="Name" act="set">${name}</Attribute>`,
    `<Relation name="Asset" act="set">`,
    `<Asset href="/rest-1.v1/Data/Task/${taskId}" idref="Task:${taskId}" />`,
    `</Relation>`,
    `</Asset>`
  ].join('');
}

/* TODO:
1. Support story identification using "Story.Number" (S-123456). It code currently requires an OID.
2. Sorting. The RESTful endpoint does honor the SORT options in JQL. The code could serialize the 
   create to remove the parallel async creation of all tasks.
*/
