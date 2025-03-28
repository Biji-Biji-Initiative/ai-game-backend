require('dotenv').config();
const ConversationStateRepository = require('./src/infra/repositories/ConversationStateRepository');
const { v4: uuidv4 } = require('uuid');

async function testConversationState() {
    const repository = new ConversationStateRepository();
    
    // Test data
    const testState = {
        id: uuidv4(),
        userId: 'test-user-123',
        context: 'test-context',
        lastResponseId: 'response-123',
        metadata: { test: true }
    };

    try {
        // Clean up any existing test data
        console.log('Cleaning up existing test data...');
        const existingState = await repository.findStateByContext(testState.userId, testState.context);
        if (existingState) {
            await repository.deleteState(existingState.id);
            console.log('Deleted existing test state');
        }

        console.log('\n1. Testing createState...');
        const createdState = await repository.createState(testState);
        console.log('Created state:', createdState);

        console.log('\n2. Testing findStateById...');
        const foundById = await repository.findStateById(createdState.id);
        console.log('Found state by ID:', foundById);

        console.log('\n3. Testing findStateByContext...');
        const foundByContext = await repository.findStateByContext(testState.userId, testState.context);
        console.log('Found state by context:', foundByContext);

        console.log('\n4. Testing updateState...');
        const updateResult = await repository.updateState(createdState.id, {
            lastResponseId: 'updated-response-456',
            metadata: { test: true, updated: true }
        });
        console.log('Update result:', updateResult);

        console.log('\n5. Testing deleteState...');
        const deleteResult = await repository.deleteState(createdState.id);
        console.log('Delete result:', deleteResult);

        console.log('\nAll tests completed successfully!');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testConversationState(); 