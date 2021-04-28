# aws-cdk-step-functions-playground

CDK app providing API Gateway endpoint to provision a CloudFormation stack.  Endpoint is backed by step function that
initiates the `create-stack` and polls (`describe-stack`) on an interval for completion.

This can be used as a backend to provision a [AWS CloudFormation Custom Resource Type](https://brianpfeil.com/post/aws-cloudformation-custom-resource-type/) that itself is backed by a set of AWS services.

## Architecture

<img src="https://www.evernote.com/l/AAExnb6WCDRDW7Vj2StG-7JI4d51djCzvPoB/image.png" alt="" width="100%" />

<!--
# graphviz source
digraph G {
    rankdir=LR;
    "api gateway" -> lambda
    lambda -> "step fn"
    "step fn" -> "lambda\n(cfn create stack)"
    "lambda\n(cfn create stack)" -> wait
    wait -> "lambda\n(create stack status)"
    "lambda\n(create stack status)" -> "choice (stack created?)"
    "choice (stack created?)"->wait
    "choice (stack created?)"->end
}
-->

## Dependencies

* [CDK](https://aws.amazon.com/cdk/)
* [awscurl](https://github.com/okigan/awscurl)

## Demo

```sh
# install deps
npm install

# deploy
cdk deploy  --force --require-approval never

# test with IAM auth (aws sigv4 request)
awscurl --service execute-api -X POST https://7t0zeiul1l.execute-api.us-east-1.amazonaws.com/prod/ -d '{"foo": "bar"}'
```

---
# Welcome to your CDK TypeScript project!

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
