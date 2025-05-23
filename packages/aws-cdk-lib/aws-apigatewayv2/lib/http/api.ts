import { Construct } from 'constructs';
import { IHttpRouteAuthorizer } from './authorizer';
import { HttpRouteIntegration } from './integration';
import { BatchHttpRouteOptions, HttpMethod, HttpRoute, HttpRouteKey } from './route';
import { IHttpStage, HttpStage, HttpStageOptions } from './stage';
import { VpcLink, VpcLinkProps } from './vpc-link';
import { CfnApi, CfnApiProps } from '.././index';
import { Metric, MetricOptions } from '../../../aws-cloudwatch';
import { ArnFormat, Duration, Stack, Token } from '../../../core';
import { ValidationError } from '../../../core/lib/errors';
import { addConstructMetadata, MethodMetadata } from '../../../core/lib/metadata-resource';
import { IApi, IpAddressType } from '../common/api';
import { ApiBase } from '../common/base';
import { DomainMappingOptions } from '../common/stage';

/**
 * Represents an HTTP API
 */
export interface IHttpApi extends IApi {
  /**
   * Default Authorizer applied to all routes in the gateway.
   *
   * @attribute
   * @default - no default authorizer
   */
  readonly defaultAuthorizer?: IHttpRouteAuthorizer;

  /**
   * Default OIDC scopes attached to all routes in the gateway, unless explicitly configured on the route.
   * The scopes are used with a COGNITO_USER_POOLS authorizer to authorize the method invocation.
   *
   * @attribute
   * @default - no default authorization scopes
   */
  readonly defaultAuthorizationScopes?: string[];

  /**
   * The default stage of this API
   *
   * @attribute
   * @default - a stage will be created
   */
  readonly defaultStage?: IHttpStage;

  /**
   * Metric for the number of client-side errors captured in a given period.
   *
   * @default - sum over 5 minutes
   */
  metricClientError(props?: MetricOptions): Metric;

  /**
   * Metric for the number of server-side errors captured in a given period.
   *
   * @default - sum over 5 minutes
   */
  metricServerError(props?: MetricOptions): Metric;

  /**
   * Metric for the amount of data processed in bytes.
   *
   * @default - sum over 5 minutes
   */
  metricDataProcessed(props?: MetricOptions): Metric;

  /**
   * Metric for the total number API requests in a given period.
   *
   * @default - SampleCount over 5 minutes
   */
  metricCount(props?: MetricOptions): Metric;

  /**
   * Metric for the time between when API Gateway relays a request to the backend
   * and when it receives a response from the backend.
   *
   * @default - no statistic
   */
  metricIntegrationLatency(props?: MetricOptions): Metric;

  /**
   * The time between when API Gateway receives a request from a client
   * and when it returns a response to the client.
   * The latency includes the integration latency and other API Gateway overhead.
   *
   * @default - no statistic
   */
  metricLatency(props?: MetricOptions): Metric;

  /**
   * Add a new VpcLink
   */
  addVpcLink(options: VpcLinkProps): VpcLink;

  /**
   * Get the "execute-api" ARN.
   * When 'ANY' is passed to the method, an ARN with the method set to '*' is obtained.
   *
   * @default - The default behavior applies when no specific method, path, or stage is provided.
   * In this case, the ARN will cover all methods, all resources, and all stages of this API.
   * Specifically, if 'method' is not specified, it defaults to '*', representing all methods.
   * If 'path' is not specified, it defaults to '/*', representing all paths.
   * If 'stage' is not specified, it also defaults to '*', representing all stages.
   */
  arnForExecuteApi(method?: string, path?: string, stage?: string): string;
}

/**
 * Properties to initialize an instance of `HttpApi`.
 */
export interface HttpApiProps {
  /**
   * Name for the HTTP API resource
   * @default - id of the HttpApi construct.
   */
  readonly apiName?: string;

  /**
   * The description of the API.
   * @default - none
   */
  readonly description?: string;

  /**
   * An integration that will be configured on the catch-all route ($default).
   * @default - none
   */
  readonly defaultIntegration?: HttpRouteIntegration;

  /**
   * Whether a default stage and deployment should be automatically created.
   * @default true
   */
  readonly createDefaultStage?: boolean;

  /**
   * Specifies a CORS configuration for an API.
   * @see https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html
   * @default - CORS disabled.
   */
  readonly corsPreflight?: CorsPreflightOptions;

  /**
   * Configure a custom domain with the API mapping resource to the HTTP API
   *
   * @default - no default domain mapping configured. meaningless if `createDefaultStage` is `false`.
   */
  readonly defaultDomainMapping?: DomainMappingOptions;

  /**
   * Specifies whether clients can invoke your API using the default endpoint.
   * By default, clients can invoke your API with the default
   * `https://{api_id}.execute-api.{region}.amazonaws.com` endpoint. Set this to
   * true if you would like clients to use your custom domain name.
   * @default false execute-api endpoint enabled.
   */
  readonly disableExecuteApiEndpoint?: boolean;

  /**
   * Default Authorizer applied to all routes in the gateway.
   *
   * @default - no default authorizer
   */
  readonly defaultAuthorizer?: IHttpRouteAuthorizer;

  /**
   * Default OIDC scopes attached to all routes in the gateway, unless explicitly configured on the route.
   * The scopes are used with a COGNITO_USER_POOLS authorizer to authorize the method invocation.
   *
   * @default - no default authorization scopes
   */
  readonly defaultAuthorizationScopes?: string[];

  /**
   * Whether to set the default route selection expression for the API.
   *
   * When enabled, "${request.method} ${request.path}" is set as the default route selection expression.
   *
   * @default false
   */
  readonly routeSelectionExpression?: boolean;

  /**
   * The IP address types that can invoke the API.
   *
   * @see https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-ip-address-type.html
   *
   * @default undefined - AWS default is IPV4
   */
  readonly ipAddressType?: IpAddressType;
}

/**
 * Supported CORS HTTP methods
 */
export enum CorsHttpMethod{
  /** HTTP ANY */
  ANY = '*',
  /** HTTP DELETE */
  DELETE = 'DELETE',
  /** HTTP GET */
  GET = 'GET',
  /** HTTP HEAD */
  HEAD = 'HEAD',
  /** HTTP OPTIONS */
  OPTIONS = 'OPTIONS',
  /** HTTP PATCH */
  PATCH = 'PATCH',
  /** HTTP POST */
  POST = 'POST',
  /** HTTP PUT */
  PUT = 'PUT',
}

/**
 * Options for the CORS Configuration
 */
export interface CorsPreflightOptions {
  /**
   * Specifies whether credentials are included in the CORS request.
   * @default false
   */
  readonly allowCredentials?: boolean;

  /**
   * Represents a collection of allowed headers.
   * @default - No Headers are allowed.
   */
  readonly allowHeaders?: string[];

  /**
   * Represents a collection of allowed HTTP methods.
   * @default - No Methods are allowed.
   */
  readonly allowMethods?: CorsHttpMethod[];

  /**
   * Represents a collection of allowed origins.
   * @default - No Origins are allowed.
   */
  readonly allowOrigins?: string[];

  /**
   * Represents a collection of exposed headers.
   * @default - No Expose Headers are allowed.
   */
  readonly exposeHeaders?: string[];

  /**
   * The duration that the browser should cache preflight request results.
   * @default Duration.seconds(0)
   */
  readonly maxAge?: Duration;
}

/**
 * Options for the Route with Integration resource
 */
export interface AddRoutesOptions extends BatchHttpRouteOptions {
  /**
   * The path at which all of these routes are configured.
   */
  readonly path: string;

  /**
   * The HTTP methods to be configured
   * @default HttpMethod.ANY
   */
  readonly methods?: HttpMethod[];

  /**
   * Authorizer to be associated to these routes.
   *
   * Use NoneAuthorizer to remove the default authorizer for the api
   *
   * @default - uses the default authorizer if one is specified on the HttpApi
   */
  readonly authorizer?: IHttpRouteAuthorizer;

  /**
   * The list of OIDC scopes to include in the authorization.
   *
   * These scopes will override the default authorization scopes on the gateway.
   * Set to [] to remove default scopes
   *
   * @default - uses defaultAuthorizationScopes if configured on the API, otherwise none.
   */
  readonly authorizationScopes?: string[];
}

abstract class HttpApiBase extends ApiBase implements IHttpApi { // note that this is not exported
  public abstract override readonly apiId: string;
  public abstract readonly httpApiId: string;
  public abstract override readonly apiEndpoint: string;
  private vpcLinks: Record<string, VpcLink> = {};

  public metricClientError(props?: MetricOptions): Metric {
    return this.metric('4xx', { statistic: 'Sum', ...props });
  }

  public metricServerError(props?: MetricOptions): Metric {
    return this.metric('5xx', { statistic: 'Sum', ...props });
  }

  public metricDataProcessed(props?: MetricOptions): Metric {
    return this.metric('DataProcessed', { statistic: 'Sum', ...props });
  }

  public metricCount(props?: MetricOptions): Metric {
    return this.metric('Count', { statistic: 'SampleCount', ...props });
  }

  public metricIntegrationLatency(props?: MetricOptions): Metric {
    return this.metric('IntegrationLatency', props);
  }

  public metricLatency(props?: MetricOptions): Metric {
    return this.metric('Latency', props);
  }

  public addVpcLink(options: VpcLinkProps): VpcLink {
    const { vpcId } = options.vpc;
    if (vpcId in this.vpcLinks) {
      return this.vpcLinks[vpcId];
    }

    const count = Object.keys(this.vpcLinks).length + 1;
    const vpcLink = new VpcLink(this, `VpcLink-${count}`, options);
    this.vpcLinks[vpcId] = vpcLink;

    return vpcLink;
  }

  public arnForExecuteApi(method?: string, path?: string, stage?: string): string {
    if (path && !Token.isUnresolved(path) && !path.startsWith('/')) {
      throw new ValidationError(`Path must start with '/': ${path}`, this);
    }

    if (method && method.toUpperCase() === 'ANY') {
      method = '*';
    }

    return Stack.of(this).formatArn({
      service: 'execute-api',
      resource: this.httpApiId,
      arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      resourceName: `${stage ?? '*'}/${method ?? '*'}${path ?? '/*'}`,
    });
  }
}

/**
 * Attributes for importing an HttpApi into the CDK
 */
export interface HttpApiAttributes {
  /**
   * The identifier of the HttpApi
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigatewayv2-api.html#aws-resource-apigatewayv2-api-return-values
   */
  readonly httpApiId: string;

  /**
   * The endpoint URL of the HttpApi
   * @default - throws an error if apiEndpoint is accessed.
   */
  readonly apiEndpoint?: string;
}

/**
 * Create a new API Gateway HTTP API endpoint.
 * @resource AWS::ApiGatewayV2::Api
 */
export class HttpApi extends HttpApiBase {
  /**
   * Import an existing HTTP API into this CDK app.
   */
  public static fromHttpApiAttributes(scope: Construct, id: string, attrs: HttpApiAttributes): IHttpApi {
    class Import extends HttpApiBase {
      public readonly apiId = attrs.httpApiId;
      public readonly httpApiId = attrs.httpApiId;
      private readonly _apiEndpoint = attrs.apiEndpoint;

      public get apiEndpoint(): string {
        if (!this._apiEndpoint) {
          throw new ValidationError('apiEndpoint is not configured on the imported HttpApi.', scope);
        }
        return this._apiEndpoint;
      }
    }
    return new Import(scope, id);
  }

  /**
   * A human friendly name for this HTTP API. Note that this is different from `httpApiId`.
   */
  public readonly httpApiName?: string;
  public readonly apiId: string;

  /**
   * The identifier of the HTTP API.
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigatewayv2-api.html#aws-resource-apigatewayv2-api-return-values
   */
  public readonly httpApiId: string;

  /**
   * Specifies whether clients can invoke this HTTP API by using the default execute-api endpoint.
   */
  public readonly disableExecuteApiEndpoint?: boolean;

  /**
   * The default stage of this API
   */
  public readonly defaultStage: IHttpStage | undefined;

  /**
   * Default Authorizer applied to all routes in the gateway.
   */
  public readonly defaultAuthorizer?: IHttpRouteAuthorizer;

  /**
   * Default OIDC scopes attached to all routes in the gateway, unless explicitly configured on the route.
   * The scopes are used with a COGNITO_USER_POOLS authorizer to authorize the method invocation.
   */
  public readonly defaultAuthorizationScopes?: string[];

  private readonly _apiEndpoint: string;

  constructor(scope: Construct, id: string, props?: HttpApiProps) {
    super(scope, id);
    // Enhanced CDK Analytics Telemetry
    addConstructMetadata(this, props);

    this.httpApiName = props?.apiName ?? id;
    this.disableExecuteApiEndpoint = props?.disableExecuteApiEndpoint;

    let corsConfiguration: CfnApi.CorsProperty | undefined;
    if (props?.corsPreflight) {
      const cors = props.corsPreflight;
      if (cors.allowOrigins && cors.allowOrigins.includes('*') && cors.allowCredentials) {
        throw new ValidationError("CORS preflight - allowCredentials is not supported when allowOrigin is '*'", scope);
      }
      const {
        allowCredentials,
        allowHeaders,
        allowMethods,
        allowOrigins,
        exposeHeaders,
        maxAge,
      } = props.corsPreflight;
      corsConfiguration = {
        allowCredentials,
        allowHeaders,
        allowMethods,
        allowOrigins,
        exposeHeaders,
        maxAge: maxAge?.toSeconds(),
      };
    }

    const apiProps: CfnApiProps = {
      name: this.httpApiName,
      protocolType: 'HTTP',
      corsConfiguration,
      description: props?.description,
      disableExecuteApiEndpoint: this.disableExecuteApiEndpoint,
      routeSelectionExpression: props?.routeSelectionExpression ? '${request.method} ${request.path}' : undefined,
      ipAddressType: props?.ipAddressType,
    };

    const resource = new CfnApi(this, 'Resource', apiProps);
    this.apiId = resource.ref;
    this.httpApiId = resource.ref;
    this._apiEndpoint = resource.attrApiEndpoint;
    this.defaultAuthorizer = props?.defaultAuthorizer;
    this.defaultAuthorizationScopes = props?.defaultAuthorizationScopes;

    if (props?.defaultIntegration) {
      new HttpRoute(this, 'DefaultRoute', {
        httpApi: this,
        routeKey: HttpRouteKey.DEFAULT,
        integration: props.defaultIntegration,
        authorizer: props.defaultAuthorizer,
        authorizationScopes: props.defaultAuthorizationScopes,
      });
    }

    if (props?.createDefaultStage === undefined || props.createDefaultStage === true) {
      this.defaultStage = new HttpStage(this, 'DefaultStage', {
        httpApi: this,
        autoDeploy: true,
        domainMapping: props?.defaultDomainMapping,
      });

      // to ensure the domain is ready before creating the default stage
      if (props?.defaultDomainMapping) {
        this.defaultStage.node.addDependency(props.defaultDomainMapping.domainName);
      }
    }

    if (props?.createDefaultStage === false && props.defaultDomainMapping) {
      throw new ValidationError('defaultDomainMapping not supported with createDefaultStage disabled', scope);
    }
  }

  /**
   * Get the default endpoint for this API.
   */
  public get apiEndpoint(): string {
    if (this.disableExecuteApiEndpoint) {
      throw new ValidationError('apiEndpoint is not accessible when disableExecuteApiEndpoint is set to true.', this);
    }
    return this._apiEndpoint;
  }

  /**
   * Get the URL to the default stage of this API.
   * Returns `undefined` if `createDefaultStage` is unset.
   */
  public get url(): string | undefined {
    return this.defaultStage ? this.defaultStage.url : undefined;
  }

  /**
   * Add a new stage.
   */
  @MethodMetadata()
  public addStage(id: string, options: HttpStageOptions): HttpStage {
    const stage = new HttpStage(this, id, {
      httpApi: this,
      ...options,
    });
    return stage;
  }

  /**
   * Add multiple routes that uses the same configuration. The routes all go to the same path, but for different
   * methods.
   */
  @MethodMetadata()
  public addRoutes(options: AddRoutesOptions): HttpRoute[] {
    const methods = options.methods ?? [HttpMethod.ANY];
    return methods.map((method) => {
      const authorizationScopes = options.authorizationScopes ?? this.defaultAuthorizationScopes;

      return new HttpRoute(this, `${method}${options.path}`, {
        httpApi: this,
        routeKey: HttpRouteKey.with(options.path, method),
        integration: options.integration,
        authorizer: options.authorizer ?? this.defaultAuthorizer,
        authorizationScopes,
      });
    });
  }
}
