# Build and Push Docker Image to Artifact Registry
# Project: avaipl29dec | Region: asia-south2 (Delhi)

$ProjectId = "avaipl29dec"
$Region = "asia-south2"  # Delhi region
$Repository = "aromapureair"
$ServiceName = "aromapureair-backend"
$ImageTag = "latest"
$imageName = "$Region-docker.pkg.dev/$ProjectId/$Repository/$ServiceName"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Building and Pushing Docker Image" -ForegroundColor Green
Write-Host "Project: $ProjectId" -ForegroundColor Cyan
Write-Host "Region: $Region (Delhi)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Green

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

# Set project
Write-Host "Setting GCP project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Configure Docker authentication
Write-Host "Configuring Docker authentication..." -ForegroundColor Yellow
gcloud auth configure-docker $Region-docker.pkg.dev --quiet

# Build Docker image
Write-Host "`nBuilding Docker image..." -ForegroundColor Yellow
docker build -t $imageName`:$ImageTag .

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Docker image built successfully!" -ForegroundColor Green

# Push to Artifact Registry
Write-Host "`nPushing image to Artifact Registry..." -ForegroundColor Yellow
docker push $imageName`:$ImageTag

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker push failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Build and Push Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Image: $imageName`:$ImageTag" -ForegroundColor Cyan
Write-Host "`nYou can now deploy this image to Cloud Run manually." -ForegroundColor Yellow
Write-Host "Example deployment command:" -ForegroundColor Yellow
Write-Host "gcloud run deploy $ServiceName --image $imageName`:$ImageTag --platform managed --region $Region --allow-unauthenticated --port 8080" -ForegroundColor Cyan

