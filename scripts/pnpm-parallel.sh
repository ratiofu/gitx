#!/usr/bin/env bash

# Capture start time (nanoseconds)
start_time=$(date +%s%N)

# Function to report runtime
report_runtime() {
  end_time=$(date +%s%N)
  elapsed_ns=$((end_time - start_time))
  elapsed_s=$((elapsed_ns / 1000000000))
  elapsed_ms=$(((elapsed_ns / 1000000) % 1000))
  echo "⏱️  took ${elapsed_s}.${elapsed_ms}s"
}

# Define checks
checks=("$@")

if [ ${#checks[@]} -eq 0 ]; then
  echo "❌ No checks provided"
  exit 1
fi

# Track background PIDs and their check names
declare -A pid_to_check
pids=()

for check in "${checks[@]}"; do
  echo "🚀 starting: $check"
  pnpm "$check" &
  pid=$!
  pids+=($pid)
  pid_to_check[$pid]=$check
done

# Function to kill remaining background jobs
cleanup() {
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null
  done
  report_runtime
}
trap cleanup EXIT

exit_code=0
failed_check=""

# Wait for jobs one by one
while [ ${#pid_to_check[@]} -gt 0 ]; do
  if ! wait -n -p finished_pid; then
    status=$?
    failed_check=${pid_to_check[$finished_pid]}
    echo "❌ check '$failed_check' failed (status $status)"
    exit_code=$status
    break
  else
    echo "✅ check '${pid_to_check[$finished_pid]}' passed"
  fi
  unset "pid_to_check[$finished_pid]"
done

if [ $exit_code -eq 0 ]; then
  echo "✅ all checks passed"
fi

exit $exit_code
