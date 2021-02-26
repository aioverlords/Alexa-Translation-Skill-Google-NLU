const {
    Datastore
} = require('@google-cloud/datastore');

const datastore = new Datastore({
    projectId: "macgyver-services-production",
});

(async function () {



    // The kind for the new entity
    const kind = 'Babel App Alexa User Language Selection';

    // The name/ID for the new entity
    const name = Date.now();

    // The Cloud Datastore key for the new entity 
    var username = 'test-script';

    const query = datastore.createQuery('Babel App Alexa User Language Selection')
        .filter('username', '=', username)
        .order('timestamp', {
            descending: true,
        });

    const [tasks] = await datastore.runQuery(query);
    console.log(tasks[0].language);

}());