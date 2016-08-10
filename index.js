const AWS = require('aws-sdk');
const twilio = require('twilio');

exports.handler = function(event, context) {

  console.log("JSON API from Semaphore: %j", event);

  AWS.config.apiVersions = {
    s3: '2006-03-01'
  }

  // configure s3 connection
  const s3 = new AWS.S3({region: 'us-west-2'});

  // grab config object out of S3 bucket
  const params = {Bucket: 'test-bucket-123123', Key: 'numbers.json'};

  s3.getObject(params, function(err, data) {
    if(err) console.log(err, err.stack); // an error has happened on AWS

    // Parse JSON file and put it in numbers variable
    var numbers = JSON.parse(data.Body);

    manipulateNumbers(numbers);
  });

  function manipulateNumbers(numbers) {
    // if someone breaks the master build on Semaphore
    if(event.branch_name === 'master' && event.result === 'failed') {
      // find out who to blame
      const blame = event.commit.author_name;

      // message that is sent to the developer who broke master
      const message = `Congrats ${blame}, you broke the build`;

      twilioHandler(numbers, message);
    }
  }

  function twilioHandler(numbers, message) {

    // twilio creds / setup
    const twilio_account_sid = numbers.twilio.twilio_account_sid;
    const twilio_auth_token = numbers.twilio.twilio_auth_token;
    const twilio_number = numbers.twilio.twilio_number;
    const client = twilio(twilio_account_sid, twilio_auth_token);

    // grab email of the person to blame
    const blame_email = event.commit.author_email;

    // actually send the SMS
    client.sendSms({
      to: numbers[blame_email],
      from: twilio_number,
      body: message
    }, function(err, response) {
      if(err) {
        console.log(err);
        context.done(null, 'There was an error, message not sent');
        return;
      }

      console.log(response);
      context.done(null, `Message sent to ${numbers[blame_email]}`);
    })
  }
}
