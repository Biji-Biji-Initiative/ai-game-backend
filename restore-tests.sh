#!/bin/bash
echo "Restoring tests directory from backup: /Users/gsplace/ai back end game/tests-backup-2025-03-30T04-14-12"
rsync -a "/Users/gsplace/ai back end game/tests-backup-2025-03-30T04-14-12/" "/Users/gsplace/ai back end game/tests/"
echo "Restore complete!"
