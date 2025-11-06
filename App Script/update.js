function updateVersion(projectId) {
  try {
    const latestVersion = createVersion(projectId); // Create a new version
    const deployments = listDeployments(projectId); // List all deployments
    const webAppDeployment = deployments.find(deployment =>
      deployment.entryPoints.some(entryPoint => entryPoint.entryPointType === "WEB_APP")
    );

    if (!webAppDeployment) {
      throw new Error("No Web App deployment found.");
    }

    const deploymentId = webAppDeployment.deploymentId;
    updateToLatestVersion(projectId, deploymentId, latestVersion);

    return ContentService.createTextOutput(`Successfully updated to version ${latestVersion}`);
  } catch (error) {
    return ContentService.createTextOutput(`Error: ${error.message}`);
  }
}



// Helper function to create a new version of the script
function createVersion(projectId) {
  const url = `https://script.googleapis.com/v1/projects/${projectId}/versions`;
  const token = ScriptApp.getOAuthToken();

  const options = {
    method: "post",
    headers: {
      Authorization: `Bearer ${token}`
    },
    contentType: "application/json",
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error(`Error creating version: ${json.error.message}`);
  }

  Logger.log(`Created version: ${json.versionNumber}`);
  return json.versionNumber;
}

// Helper function to list deployments
function listDeployments(projectId) {
  const url = `https://script.googleapis.com/v1/projects/${projectId}/deployments`;
  const token = ScriptApp.getOAuthToken();

  const options = {
    headers: {
      Authorization: `Bearer ${token}`
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const content = response.getContentText();
  const json = JSON.parse(content);

  if (response.getResponseCode() !== 200) {
    throw new Error(`Error fetching deployments: ${json.error.message}`);
  }

  return json.deployments;
}

// Helper function to update the deployment to the latest version
function updateToLatestVersion(projectId, deploymentId, latestVersion) {
  const url = `https://script.googleapis.com/v1/projects/${projectId}/deployments/${deploymentId}`;
  const token = ScriptApp.getOAuthToken();

  const payload = {
    deploymentConfig: {
      versionNumber: latestVersion,
      description: `Updated to version ${latestVersion}`
    }
  };

  const options = {
    method: "patch",
    headers: {
      Authorization: `Bearer ${token}`
    },
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const json = JSON.parse(response.getContentText());

  if (response.getResponseCode() !== 200) {
    throw new Error(`Error updating deployment: ${json.error.message}`);
  }

  Logger.log(`Updated deployment: ${deploymentId} to version ${latestVersion}`);
}
