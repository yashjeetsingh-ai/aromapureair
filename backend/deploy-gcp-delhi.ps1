# Deploy to Google Cloud Run - Delhi Region with Secret Manager
# Project: avaipl29dec | Region: asia-south2 (Delhi)

# Add gcloud to PATH if not already there
$gcloudPath = "C:\Users\hp\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin"
if (Test-Path $gcloudPath) {
    if ($env:PATH -notlike "*$gcloudPath*") {
        $env:PATH += ";$gcloudPath"
    }
} else {
    Write-Host "WARNING: gcloud path not found at $gcloudPath" -ForegroundColor Yellow
    Write-Host "Please install Google Cloud SDK or update the path in this script." -ForegroundColor Yellow
}

$ProjectId = "avaipl29dec"
$Region = "asia-south2"  # Delhi region
$Repository = "aromapureair"
$ServiceName = "aromapureair-backend"
$ImageTag = "latest"
$imageName = "$Region-docker.pkg.dev/$ProjectId/$Repository/$ServiceName"
$SecretName = "google-service-json"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Deploying to Google Cloud Run" -ForegroundColor Green
Write-Host "Project: $ProjectId" -ForegroundColor Cyan
Write-Host "Region: $Region (Delhi)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Green

# Set project
Write-Host "Setting GCP project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Enable APIs
Write-Host "Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable artifactregistry.googleapis.com --quiet
gcloud services enable run.googleapis.com --quiet
gcloud services enable secretmanager.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet

# Create Artifact Registry repository if needed
Write-Host "Setting up Artifact Registry..." -ForegroundColor Yellow
$repoExists = gcloud artifacts repositories describe $Repository --location=$Region --format="value(name)" 2>$null
if (-not $repoExists) {
    Write-Host "Creating Artifact Registry repository..." -ForegroundColor Yellow
    gcloud artifacts repositories create $Repository `
        --repository-format=docker `
        --location=$Region `
        --description="Aromapureair Docker images" `
        --quiet
    Write-Host "Repository created." -ForegroundColor Green
} else {
    Write-Host "Repository already exists." -ForegroundColor Green
}

# Configure Docker authentication
Write-Host "Configuring Docker authentication..." -ForegroundColor Yellow
gcloud auth configure-docker $Region-docker.pkg.dev --quiet

# Verify secret exists in Secret Manager
Write-Host "Verifying Secret Manager secret..." -ForegroundColor Yellow
$secretExists = gcloud secrets describe $SecretName --format="value(name)" 2>$null
if (-not $secretExists) {
    Write-Host "ERROR: Secret '$SecretName' not found in Secret Manager!" -ForegroundColor Red
    Write-Host "Please create the secret first in Cloud Console or using:" -ForegroundColor Yellow
    Write-Host "gcloud secrets create $SecretName --data-file=./google_service.json --replication-policy=automatic" -ForegroundColor Cyan
    exit 1
} else {
    Write-Host "Secret found: $SecretName" -ForegroundColor Green
}

# Grant Cloud Run service account access to the secret
Write-Host "Granting Cloud Run access to secret..." -ForegroundColor Yellow
$projectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)"
$serviceAccount = "$projectNumber-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding $SecretName `
    --member="serviceAccount:$serviceAccount" `
    --role="roles/secretmanager.secretAccessor" `
    --quiet

Write-Host "IAM binding updated." -ForegroundColor Green

# Build Docker image
Write-Host "`nBuilding Docker image..." -ForegroundColor Yellow
# We're already in backend directory, so build from current directory
docker build -t $imageName`:$ImageTag .

# Push to Artifact Registry
Write-Host "Pushing image to Artifact Registry..." -ForegroundColor Yellow
docker push $imageName`:$ImageTag

Write-Host "Image pushed successfully!" -ForegroundColor Green
Write-Host "Image: $imageName`:$ImageTag" -ForegroundColor Cyan

# Deploy to Cloud Run with Secret Manager
Write-Host "`nDeploying to Cloud Run..." -ForegroundColor Yellow

# Check if service exists
$serviceExists = gcloud run services describe $ServiceName --region=$Region --format="value(name)" 2>$null

# Secret mounting: Mount secret as file at /secrets/google-service-json
# Format: /MOUNT_PATH/FILENAME=SECRET_NAME:VERSION
# This creates a file at /secrets/google-service-json with the secret content
$secretMountPath = "/secrets/google-service-json"
$secretMountConfig = "${secretMountPath}=${SecretName}:latest"

# Environment variables - build as array for proper handling
$allowedOrigins = "https://aromapureair.vercel.app"

if ($serviceExists) {
    Write-Host "Service exists. Updating configuration..." -ForegroundColor Yellow
    # First remove the old secret configuration (as env var)
    Write-Host "Removing old secret configuration..." -ForegroundColor Yellow
    gcloud run services update $ServiceName `
        --region $Region `
        --remove-secrets "google-service-json" `
        --quiet 2>$null
    
    # Deploy with correct secret mounting and port
    # Use separate --update-env-vars flags for each variable to handle commas properly
    gcloud run deploy $ServiceName `
        --image "$imageName`:$ImageTag" `
        --platform managed `
        --region $Region `
        --allow-unauthenticated `
        --port 8080 `
        --memory 512Mi `
        --cpu 1 `
        --timeout 300 `
        --max-instances 10 `
        --min-instances 0 `
        --update-secrets "$secretMountConfig" `
        --update-env-vars "GOOGLE_SERVICE_JSON=$secretMountPath" `
        --update-env-vars "ALLOWED_ORIGINS=$allowedOrigins" `
        --quiet
} else {
    Write-Host "Creating new service..." -ForegroundColor Yellow
    # For new service, use --set-secrets and --set-env-vars
    gcloud run deploy $ServiceName `
        --image "$imageName`:$ImageTag" `
        --platform managed `
        --region $Region `
        --allow-unauthenticated `
        --port 8080 `
        --memory 512Mi `
        --cpu 1 `
        --timeout 300 `
        --max-instances 10 `
        --min-instances 0 `
        --set-secrets "$secretMountConfig" `
        --set-env-vars "GOOGLE_SERVICE_JSON=$secretMountPath" `
        --set-env-vars "ALLOWED_ORIGINS=$allowedOrigins" `
        --quiet
}

# Get service URL
$serviceUrl = gcloud run services describe $ServiceName --region=$Region --format='value(status.url)'

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Service URL: $serviceUrl" -ForegroundColor Cyan
Write-Host "API Health: $serviceUrl/api/health" -ForegroundColor Cyan
Write-Host "API Docs: $serviceUrl/docs" -ForegroundColor Cyan
Write-Host "`nNote: TOKEN_SECRET is auto-generated. For production, set a fixed TOKEN_SECRET." -ForegroundColor Yellow

