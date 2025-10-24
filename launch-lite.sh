#!/bin/bash
# Launcher for Phone Shift Roster Lite

echo "🚀 Opening Phone Shift Roster Lite..."
echo ""
echo "This is a standalone tool for 6-week phone shift roster generation."
echo ""

# Check if we're in codespace/dev container
if [ -n "$CODESPACES" ] || [ -n "$DEVCONTAINER" ]; then
    echo "📍 Development Environment Detected"
    echo ""
    echo "To view the roster tool:"
    echo "1. Open 'roster-lite.html' in the VS Code browser preview, OR"
    echo "2. Use the Simple Browser extension, OR"
    echo "3. Forward port and access via browser"
    echo ""
    echo "The file is located at: $(pwd)/roster-lite.html"
else
    # Try to open in default browser
    if command -v xdg-open > /dev/null; then
        xdg-open "roster-lite.html"
    elif command -v open > /dev/null; then
        open "roster-lite.html"
    elif [ -n "$BROWSER" ]; then
        "$BROWSER" "roster-lite.html"
    else
        echo "Please open 'roster-lite.html' in your web browser"
    fi
fi
