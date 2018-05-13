const dotenv = require('dotenv');
dotenv.config();

const axios = require('axios');

var escape = require("escape-html");

const {JIRAUSER,JIRAPASS,V1USER,V1PASS} = process.env; // Your account usernames and passwords.

const V1_BASE_URI = process.env.V1_BASE_URI;      // http://www.yourv1.com
const JIRA_BASE_URI = process.env.JIRA_BASE_URI;  // http://www.yourjira.com
const STORY_ID = process.env.STORY_ID;            // 876543 (Not the S-12345 looking thing)
const JIRA_JQL = process.env.JIRA_JQL;            // 'project = abc AND status in (open) and issuetype in (defect)'


const V1_TASK_URI = V1_BASE_URI + '/rest-1.v1/Data/Task';
const V1_LINK_URI = V1_BASE_URI + '/rest-1.v1/Data/Link';
const JIRA_URI = JIRA_BASE_URI + '/rest/api/2/search';

const JIRA_MAX_RESULTS = 50;

axios.defaults.auth = {username: V1USER, password: V1PASS};

getJiraDefects(createJiraSearchRequestBody()).then ( defects => {
    createV1TasksFromDefects(defects).then (tasks => {
        console.log(tasks);
    });
});

//
// FUNCTIONS
//

function createJiraSearchRequestBody () {
  return {
    'jql':JIRA_JQL,
    'startAt':0,
    'maxResults':JIRA_MAX_RESULTS,
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
  }
}

async function getJiraDefects(requestBody) {
  try {
    response = await axios.post(JIRA_URI,requestBody,{auth:{username:JIRAUSER,password:JIRAPASS}})
    return response.data.issues.map(transformDefect);
  }
  catch (err) {
    console.log('Error in getJiraDefects: ' + err);
  }
}

function transformDefect(defect) {
    let key = defect.key;
    let url = JIRA_BASE_URI + `/browse/${defect.key}`;
    let link = createHTMLLink(url,url);
    let title = `P${defect.fields.priority.id}   ${defect.key}  ${escape(defect.fields.summary)}`;
    let description = [
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
  return {key,url,title,description};
}

function createHTMLLink(href,text) {
  return `<![CDATA[<a href=${href}>${text}</a>]]>`;
}

function createNewV1TaskRequestBody(defect) {
  return [
      `<Asset href="/rest-1.v1/New/Task">`,
      `<Attribute name="Name" act="set">${defect.title}</Attribute>`,
      `<Attribute name="Description" act="set">${defect.description}</Attribute>`,
      `<Relation name="Parent" act="set">`,
      `<Asset href="/rest-1.v1/Data/Story/${STORY_ID}" idref="Story:${STORY_ID}" />`,
      `</Relation>`,
      `</Asset>`
  ].join('');
  }

async function createV1TasksFromDefects(defects) {
  try {  
    const allPromises = defects.map(createV1TaskFromDefect);
    let tasks = await Promise.all(allPromises);
    return tasks;
  } catch (err) {
    console.log('Error in createV1TasksFromDefects: ' + err);
  }
}

async function createV1TaskFromDefect(defect) {
  try {
    let taskRequestBody = createNewV1TaskRequestBody(defect);
    const taskResponse = await axios.post(V1_TASK_URI,taskRequestBody);
    let taskId = taskResponse.data.id;
    taskId=taskId.split(':')[1];
   
    let linkRequestBody = createNewV1LinkRequestBody('JIRA',defect.url,taskId)
    let linkResponse = await axios.post(V1_LINK_URI, linkRequestBody);
    return `${taskId}`;
  } catch (err) {
    console.log('Error in createV1TaskFromDefect' + err);
  }
}

function createNewV1LinkRequestBody(name,url,taskId) {
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
