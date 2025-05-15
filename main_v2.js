import { Client, Databases, Query, Permission, Role, Functions } from "appwrite";

console.log('main_v2.js loaded');

const client = new Client();
client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('6803983a00018abf558b');

const databases = new Databases(client);
const functions = new Functions(client);

// Function ID (not the deployment ID)
const VERIFY_FUNCTION_ID = "6a55cf0f000c02fb5d2b";

// Input Validation for Number-Only Textareas
const titleInput = document.getElementById('title');
const textInput = document.getElementById('text');

const validateNumberInput = (inputElement) => {
    if (!inputElement) return;
    inputElement.addEventListener('input', () => {
        const currentValue = inputElement.value;
        const sanitizedValue = currentValue.replace(/[^0-9]/g, ''); // Remove non-numeric characters
        if (currentValue !== sanitizedValue) {
            inputElement.value = sanitizedValue; // Update input value with the sanitized version
        }
    });
};

validateNumberInput(titleInput);
validateNumberInput(textInput);

// Admin UI/actions are defined at top-level and are invoked after successful verification
function addAdminButtons() {
    const adminActions = document.getElementById('admin-actions');
    adminActions.innerHTML = ''; // Clear any previous buttons

    const uploadButton = document.createElement('button');
    uploadButton.id = 'uploadText';
    uploadButton.textContent = 'Upload/Update Strikes';
    uploadButton.dataset.umamiEvent = 'Upload/Update Strikes button';
    adminActions.appendChild(uploadButton);

    const deleteButton = document.createElement('button');
    deleteButton.id = 'deleteEntry';
    deleteButton.textContent = 'Delete Phone Number';
    deleteButton.dataset.umamiEvent = 'Delete Phone Number button';
    adminActions.appendChild(deleteButton);

    uploadButton.addEventListener('click', async () => {
        const titleText = document.getElementById('title').value;
        const mainText = document.getElementById('text').value;
        if (!titleText || !mainText) {
            document.getElementById('results').innerHTML = "Phone number and strikes cannot be empty.";
            return;
        }

        try {
            const response = await databases.listDocuments(
                "68039b9b000aefa4e2bf",
                "68039ba400027d4de1da",
                [Query.equal('Phone-Number', String(titleText))]
            );

            if (response.total === 0) {
                await databases.createDocument(
                    '68039b9b000aefa4e2bf',
                    '68039ba400027d4de1da',
                    titleText,
                    { "Phone-Number": titleText, Strikes: mainText }
                );
                document.getElementById('results').innerHTML = `Successfully created entry for ${titleText} with ${mainText} strike(s).`;
            } else {
                const documentId = response.documents[0].$id;
                await databases.updateDocument(
                    '68039b9b000aefa4e2bf',
                    '68039ba400027d4de1da',
                    documentId,
                    { Strikes: mainText }
                );
                document.getElementById('results').innerHTML = `Successfully updated strikes for ${titleText} to ${mainText}.`;
            }
        } catch (error) {
            console.log("Error creating/updating document:", error);
            document.getElementById('results').innerHTML = "An error occurred while saving the data.";
        }
    });

    deleteButton.addEventListener('click', async () => {
        const titleText = document.getElementById('title').value;
        if (!titleText) {
            document.getElementById('results').innerHTML = "Please enter a phone number to delete.";
            return;
        }
        
        try {
            const response = await databases.listDocuments(
                "68039b9b000aefa4e2bf",
                "68039ba400027d4de1da",
                [Query.equal('Phone-Number', String(titleText))]
            );

            if (response.total === 0) {
                document.getElementById('results').innerHTML = "Cannot delete: Entry not found.";
            } else {
                const documentId = response.documents[0].$id;
                await databases.deleteDocument(
                    "68039b9b000aefa4e2bf",
                    "68039ba400027d4de1da",
                    documentId
                );
                document.getElementById('results').innerHTML = "Phone number deleted successfully.";
            }
        } catch (error) {
            console.log("Error deleting document:", error);
            document.getElementById('results').innerHTML = "An error occurred while deleting the entry.";
        }
    });
}

// Function to list all documents
const listAllDocuments = () => {
    databases.listDocuments(
        "68039b9b000aefa4e2bf",
        "68039ba400027d4de1da"
    ).then(response => {
        console.log("listAllData:", response);
        if (response.documents.length > 0) {
            let output = "<h2>All Phone Numbers and Strikes:</h2><ul>";
            for (const document of response.documents) {
                output += `<li><strong>${document["Phone-Number"]}:</strong> ${document.Strikes}</li>`;
            }
            output += "</ul>";
            document.getElementById('results').innerHTML = output;
        } else {
            document.getElementById('results').innerHTML = "No phone numbers found in the database.";
        }
    }, error => {
        console.log(error);
        document.getElementById('results').innerHTML = "Error listing documents.";
    });
};

// Function to find a specific document
const listDocuments = (queries) => {
    databases.listDocuments(
        "68039b9b000aefa4e2bf",
        "68039ba400027d4de1da",
        queries
    ).then(response => {
        console.log("listDocuments:", response);
        if (response.documents.length > 0) {
            const { "Phone-Number": phoneNumber, Strikes } = response.documents[0];
            document.getElementById('results').innerHTML = `The number of strikes for phone number "${phoneNumber}" is ${Strikes}`;
        } else {
            document.getElementById('results').innerHTML = `No phone number matching "${document.getElementById('title').value}" was found.`;
        }
    }, error => {
        console.log(error);
        document.getElementById('results').innerHTML = "Error finding document.";
    });
};

// --- TOP-LEVEL EVENT LISTENERS ---

document.getElementById('searchTitle').addEventListener('click', () => {
    const titleText = document.getElementById('title').value;
    if (!titleText) return;
    console.log('Searching for:', titleText);
    listDocuments([Query.equal('Phone-Number', titleText)]);
});

document.getElementById('listAll').addEventListener('click', () => {
    listAllDocuments();
});

document.getElementById('adminMode').addEventListener('click', async () => {
    const enteredPassword = prompt("Enter the admin password:");
    if (enteredPassword === null) return;

    try {
        const exec = await functions.createExecution(VERIFY_FUNCTION_ID, JSON.stringify({ password: enteredPassword }));
        
        console.log("Full exec object:", exec);

        let result = null;
        const output = exec.responseBody || exec.response || exec.stdout || exec.output || '';
        console.log("Raw output:", output);
        
        if (output) {
            try { result = JSON.parse(output); } catch (e) { result = null; }
        }
        
        console.log("Parsed result:", result);

        if (result && result.authorized) {
            document.getElementById('results').innerHTML = "Admin mode unlocked.";
            addAdminButtons();
            sessionStorage.setItem('isAdmin', '1');
        } else {
            document.getElementById('results').innerHTML = "Incorrect password or login failed.";
        }

    } catch (error) {
        console.log(error);
        document.getElementById('results').innerHTML = "An error occurred during login.";
    }
});
