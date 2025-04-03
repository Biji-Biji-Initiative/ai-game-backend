echo "Creating backups of all YAML files..."
cp backend/openapi/paths/*.yaml yaml_backups/paths/
cp backend/openapi/components/responses/*.yaml yaml_backups/components/responses/
echo "Backups created in yaml_backups directory"
