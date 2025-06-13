# Quality Tools Setup Guide

This document explains how to set up SonarCloud and Codecov for the BunSQLiteORM project.

## Prerequisites

- GitHub repository with admin access
- GitHub Actions already configured

## SonarCloud Setup

### 1. Create SonarCloud Account
1. Go to [SonarCloud.io](https://sonarcloud.io)
2. Sign in with your GitHub account
3. Import your `angelxmoreno/bun-sqlite-orm` repository

### 2. Configure SonarCloud Project
1. In SonarCloud, go to your project settings
2. Set the project key: `angelxmoreno_bun-sqlite-orm`
3. Create a new organization or use existing: `angelxmoreno`

### 3. Generate SonarCloud Token
1. In SonarCloud, go to **My Account > Security**
2. Generate a new token with a descriptive name (e.g., "BunSQLiteORM-GitHub-Actions")
3. Copy the token value

### 4. Add GitHub Secret
1. Go to your GitHub repository settings
2. Navigate to **Secrets and variables > Actions**
3. Add a new repository secret:
   - Name: `SONAR_TOKEN`
   - Value: The token from step 3

## Codecov Setup

### 1. Create Codecov Account
1. Go to [Codecov.io](https://codecov.io)
2. Sign in with your GitHub account
3. Add your `angelxmoreno/bun-sqlite-orm` repository

### 2. Get Codecov Token
1. In Codecov, go to your repository settings
2. Copy the **Upload Token**

### 3. Add GitHub Secret
1. Go to your GitHub repository settings
2. Navigate to **Secrets and variables > Actions**
3. Add a new repository secret:
   - Name: `CODECOV_TOKEN`
   - Value: The token from step 2

### 4. Update README Badge
Replace `YOUR_TOKEN_HERE` in the Codecov badge with your actual graph token from Codecov settings.

## Testing the Setup

1. Commit these changes to your branch
2. Create a pull request
3. Check that the GitHub Actions workflow runs successfully
4. Verify coverage appears in Codecov
5. Verify quality analysis appears in SonarCloud

## Expected Results

After successful setup, you should see:

### SonarCloud Analysis
- **Quality Gate**: Pass/Fail status
- **Maintainability**: A-E rating
- **Reliability**: A-E rating  
- **Security**: A-E rating
- **Coverage**: Percentage from test coverage
- **Code Smells**: Issues found
- **Technical Debt**: Time estimate to fix issues

### Codecov Reports
- **Coverage Percentage**: Overall test coverage
- **Coverage Diff**: Coverage changes in PRs
- **File-by-file Coverage**: Detailed coverage reports
- **Trend Analysis**: Coverage over time

## Troubleshooting

### SonarCloud Issues
- **"Project not found"**: Check project key matches `sonar-project.properties`
- **"No coverage data"**: Ensure `lcov.info` is generated and uploaded
- **"Token invalid"**: Regenerate SONAR_TOKEN and update GitHub secret

### Codecov Issues
- **"No coverage report"**: Check that `bun test --coverage` generates `coverage/lcov.info`
- **"Upload failed"**: Verify CODECOV_TOKEN is correct
- **"No changes detected"**: Normal for initial setup

## Configuration Files

The following files have been configured:

- `sonar-project.properties`: SonarCloud project configuration
- `codecov.yml`: Codecov coverage targets and reporting
- `.github/workflows/pr-check.yml`: Updated with quality tool integration

## Quality Gates

### SonarCloud Quality Gate
- **Maintainability**: No new code smells
- **Reliability**: No new bugs
- **Security**: No new vulnerabilities
- **Coverage**: Maintain or improve coverage

### Codecov Targets
- **Project Coverage**: 80% minimum
- **Patch Coverage**: 75% minimum for new code
- **Threshold**: 1% allowed decrease for project, 2% for patches