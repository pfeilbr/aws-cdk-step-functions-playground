import * as cdk from "@aws-cdk/core";
import * as path from "path";
import * as sfn from "@aws-cdk/aws-stepfunctions";
import * as lambda from "@aws-cdk/aws-lambda";
import * as tasks from "@aws-cdk/aws-stepfunctions-tasks";
import * as iam from "@aws-cdk/aws-iam";
import { ApiGatewayToLambda } from "@aws-solutions-constructs/aws-apigateway-lambda";

const createLambdaFunctionGenerator = (scope: cdk.Construct) => {
  return (name: string) => {
    return new lambda.Function(scope, `${name}Function`, {
      runtime: lambda.Runtime.NODEJS_12_X,
      handler: `index.${name}`,
      code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
    });
  };
};

export class AwsCdkStepFunctionsPlaygroundStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cfnRole = new iam.Role(
      this,
      "CloudFormation Provision Custom Resource",
      {
        assumedBy: new iam.ServicePrincipal("cloudformation.amazonaws.com"),
      }
    );

    cfnRole.addToPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["s3:CreateBucket"],
      })
    );

    const createLambdaFunction = createLambdaFunctionGenerator(this);

    const submitCreateStackFunction = createLambdaFunction("submitCreateStack");
    submitCreateStackFunction.addEnvironment(
      "CLOUDFORMATION_ROLE_ARN",
      cfnRole.roleArn
    );
    submitCreateStackFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["cloudformation:CreateStack"],
      })
    );
    submitCreateStackFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        resources: [cfnRole.roleArn],
        actions: ["iam:PassRole"],
        conditions: {
          StringEqualsIfExists: {
            "iam:PassedToService": "cloudformation.amazonaws.com",
          },
        },
      })
    );

    const submitCreateStackTask = new tasks.LambdaInvoke(
      this,
      "submitCreateStackTask Handler",
      {
        lambdaFunction: submitCreateStackFunction,
        outputPath: "$.Payload",
      }
    );

    const waitX = new sfn.Wait(this, "Wait X Seconds", {
      time: sfn.WaitTime.secondsPath("$.waitSeconds"),
    });

    const getCreateStackStatusFunction = createLambdaFunction(
      "getCreateStackStatus"
    );

    getCreateStackStatusFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        resources: ["*"],
        actions: ["cloudformation:DescribeStacks"],
      })
    );
    const getCreateStackStatusTask = new tasks.LambdaInvoke(
      this,
      "getCreateStackStatusTask Handler",
      {
        lambdaFunction: getCreateStackStatusFunction,
        outputPath: "$.Payload",
      }
    );

    const finalStatus = new sfn.Pass(this, "finalStatus");

    const definition = submitCreateStackTask
      .next(waitX)
      .next(getCreateStackStatusTask)
      .next(
        new sfn.Choice(this, "Stack Create Complete?")
          .when(
            sfn.Condition.stringEquals(
              "$.Stacks[0].StackStatus",
              "CREATE_IN_PROGRESS"
            ),
            waitX
          )
          .otherwise(finalStatus)
      );

    const stateMachine = new sfn.StateMachine(this, "StateMachine", {
      definition,
      timeout: cdk.Duration.minutes(30),
    });

    const apiGatewayToLambda = new ApiGatewayToLambda(
      this,
      "ApiGatewayToLambdaToSfnStartExecution",
      {
        lambdaFunctionProps: {
          runtime: lambda.Runtime.NODEJS_12_X,
          handler: "index.sfnStartExecution",
          code: lambda.Code.fromAsset(`${__dirname}/lambda`),
          environment: {
            STATE_MACHINE_ARN: stateMachine.stateMachineArn,
          },
        },
      }
    );

    apiGatewayToLambda.lambdaFunction.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        resources: [stateMachine.stateMachineArn],
        actions: ["states:StartExecution"],
      })
    );
  }
}
