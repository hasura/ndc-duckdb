#!/bin/bash
# Function to handle SIGTERM and SIGINT (graceful shutdown)
graceful_shutdown() {
    echo "Shutting down gracefully..."
    # Replace this with a command to gracefully shutdown your application, if necessary
    kill -SIGTERM "$pid"
    wait "$pid"
    exit 0
}
# Function to start the application
start_application() {
    # Start the application in the background and save its PID
    node ./dist/src/index.js serve &
    pid=$!
    # Trap SIGTERM and SIGINT to call the graceful_shutdown function
    trap 'graceful_shutdown' SIGTERM SIGINT
    # Wait for the application or a signal
    wait "$pid"
}
# Function to run the update process
run_update() {
    node ./dist/generate-config.js
}
# Dispatch on the first argument to the script
case "$1" in
    update)
        shift # Remove the first argument from the arguments list
        run_update "$@"
        ;;
    *)
        start_application "$@"
        ;;
esac