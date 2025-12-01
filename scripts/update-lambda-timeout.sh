#!/bin/bash

# Script to update Lambda function timeouts for AWS Amplify Next.js API routes
# Run this script after each Amplify deployment to ensure timeouts are set correctly

set -e

echo "🔧 Updating Lambda function timeouts for AWS Amplify..."

# Get the Amplify App ID from environment or prompt
if [ -z "$AMPLIFY_APP_ID" ]; then
  echo "Please set AMPLIFY_APP_ID environment variable"
  echo "You can find it in AWS Amplify Console → Your App → App settings → General"
  exit 1
fi

# Get the branch name (default to main)
BRANCH=${AMPLIFY_BRANCH:-main}

echo "App ID: $AMPLIFY_APP_ID"
echo "Branch: $BRANCH"

# Find Lambda functions for this Amplify app
FUNCTIONS=$(aws lambda list-functions --query "Functions[?contains(FunctionName, 'amplify-$AMPLIFY_APP_ID') && contains(FunctionName, '$BRANCH')].FunctionName" --output text)

if [ -z "$FUNCTIONS" ]; then
  echo "⚠️  No Lambda functions found for this Amplify app"
  echo "Make sure AWS CLI is configured and you have the correct permissions"
  exit 1
fi

echo "Found Lambda functions:"
echo "$FUNCTIONS"
echo ""

# Update timeout for each function
for FUNCTION in $FUNCTIONS; do
  echo "Updating $FUNCTION..."
  
  # Determine timeout based on function name
  if [[ "$FUNCTION" == *"api-scrape"* ]] || [[ "$FUNCTION" == *"scrape"* ]]; then
    TIMEOUT=900  # 15 minutes for scraping
    echo "  Setting timeout to 900 seconds (15 minutes) for scraping function"
  elif [[ "$FUNCTION" == *"api-ask"* ]] || [[ "$FUNCTION" == *"ask"* ]]; then
    TIMEOUT=300  # 5 minutes for AI requests
    echo "  Setting timeout to 300 seconds (5 minutes) for AI function"
  else
    TIMEOUT=60  # 1 minute default
    echo "  Setting timeout to 60 seconds (default) for other functions"
  fi
  
  # Update the function configuration
  aws lambda update-function-configuration \
    --function-name "$FUNCTION" \
    --timeout "$TIMEOUT" \
    --output json > /dev/null
  
  if [ $? -eq 0 ]; then
    echo "  ✅ Successfully updated $FUNCTION timeout to $TIMEOUT seconds"
  else
    echo "  ❌ Failed to update $FUNCTION"
  fi
done

echo ""
echo "✨ Lambda timeout update complete!"
echo ""
echo "Note: Amplify may reset these settings on the next deployment."
echo "Consider running this script after each deployment, or set up a CI/CD step."

