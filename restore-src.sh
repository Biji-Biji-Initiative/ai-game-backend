#!/bin/bash
echo "Restoring src directory from backup: /Users/gsplace/ai back end game/src-backup-2025-03-30T03-58-41"
rsync -a "/Users/gsplace/ai back end game/src-backup-2025-03-30T03-58-41/" "/Users/gsplace/ai back end game/src/"
echo "Restore complete!"
