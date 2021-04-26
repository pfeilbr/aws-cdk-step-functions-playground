import * as cdk from "@aws-cdk/core";
import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as lambda from "@aws-cdk/aws-lambda";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";

export class AwsCdkStepFunctionsPlaygroundStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const fn = new lambda.Function(this, "myFn", {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(`
      exports.handler = async (event) => {
        console.log(event);
        return { statusCode: 201, body: 'Hello world!' };
      };
      `),
    });

    const lambdaTask = new tasks.LambdaInvoke(this, "Invoke Handler", {
      lambdaFunction: fn,
    });

    const definition = lambdaTask;

    new sfn.StateMachine(this, "StateMachine", {
      definition,
    });
  }
}
