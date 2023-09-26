#!/usr/bin/env node

const { program, option } = require('commander');
const https = require('https');


program
  .option('-u, --username <char>')
  .option('-p, --project <char>')
  .option('-k, --key <char>')
  .option('-n, --name <char>');

program.parse();

const options = program.opts();
const domain = "api.browserstack.com";

options.username = process.env.BROWSERSTACK_USERNAME?process.env.BROWSERSTACK_USERNAME:options.username;
options.key = process.env.BROWSERSTACK_ACCESS_KEY?process.env.BROWSERSTACK_ACCESS_KEY:options.key;

var getProject = function (projectname) {
    return new Promise((resolve, reject) => {
        if(options.project)
        {
            var projects_path = "automate/projects.json"
            let projects_url = new URL(`https://${domain}/${projects_path}`);
            projects_url.username = options.username
            projects_url.password = options.key
            https.get(projects_url, response => {
                let chunks_of_data = [];
    
                response.on('data', (fragments) => {
                    chunks_of_data.push(fragments);
                });
            
                response.on('end', () => {
                    let response_body = Buffer.concat(chunks_of_data);
                    resolve(JSON.parse(response_body).find(x => x.name == options.project))
                });
            });
        } else {resolve(null)}
    })
    
};


var getBuild = function (project, buildName) {
    return new Promise((resolve, reject) => {
        if(options.project && !project)
            return reject('project not found')
        var builds_path = "automate/builds.json?limit=100"
        if(project)
            builds_path += '&projectId=' + project.id
        let builds_url = new URL(`https://${domain}/${builds_path}`);
        builds_url.username = options.username
        builds_url.password = options.key
        var data = '';
        https.get(builds_url, res => {
            res.on('data', function (chunk){ data += chunk }) 
            res.on('end', function () {
                theBuild = JSON.parse(data).find((aBuild => aBuild.automation_build.name == options.name))
                if(!theBuild)
                    return reject('buildname not found')
                
                theBuild = theBuild.automation_build;
                theBuild.url = "https://automate.browserstack.com/dashboard/v2/" + theBuild.hashed_id;
                return resolve(theBuild)       
            })
        }).on('error', (e) => {
            reject(e)
        });
    })
    
};

var getSessions = function (build) {
    return new Promise((resolve, reject) => { 
        var sessions_path = `/automate/builds/${theBuild.hashed_id}/sessions.json`
        let session_url = new URL(`https://${domain}/${sessions_path}`);
        session_url.username = options.username
        session_url.password = options.key
        var session_data = '';
        https.get(session_url, res => {
            res.on('data', function (chunk){ session_data += chunk });
            res.on('end', function () {
                var sessions = JSON.parse(session_data).map(aSession => aSession.automation_session)
                return resolve(sessions);
            })
        }).on('error', (e) => {
            reject(e)
        });
    })
    
};

getProject(options.project).then((project) => {
	getBuild(project, options.name).then((build) => {
        getSessions(build).then(sessions => {
            build.sessions = sessions
            console.log(build)
        }).catch (e => {console.log(e)})
        
    }).catch (e => {console.log(e)})
}).catch (e => {console.log(e)})
