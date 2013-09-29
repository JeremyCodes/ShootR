/// <reference path="../../Scripts/endgate-0.2.0-beta1.d.ts" />
/// <reference path="../../Scripts/typings/signalr/signalr.d.ts" />
/// <reference path="IPayloadDefinitions.ts" />
/// <reference path="PayloadDecompressor.ts" />
/// <reference path="ServerConnectionManager.ts" />
/// <reference path="IUserInformation.ts" />
/// <reference path="IClientInitialization.ts" />

module ShootR.Server {

    export class ServerAdapter {
        public static NEGOTIATE_RETRIES: number = 3;
        public static RETRY_DELAY: eg.TimeSpan = eg.TimeSpan.FromSeconds(1);

        public OnPayload: eg.EventHandler1<IPayloadData>;
        public OnLeaderboardUpdate: eg.EventHandler1<Array<ILeaderboardEntryData>>;
        public OnForcedDisconnct: eg.EventHandler;
        public OnControlTransferred: eg.EventHandler;
        public OnPingRequest: eg.EventHandler;
        public OnMapResize: eg.EventHandler1<eg.Size2d>;

        private _payloadDecompressor: PayloadDecompressor;
        private _connectionManager: ServerConnectionManager;

        constructor(private _connection: HubConnection, public Proxy: HubProxy, authCookieName: string) {
            var savedProxyInvoke = this.Proxy.invoke;

            this.OnPayload = new eg.EventHandler1<IPayloadData>();
            this.OnLeaderboardUpdate = new eg.EventHandler1<Array<ILeaderboardEntryData>>();
            this.OnForcedDisconnct = new eg.EventHandler();
            this.OnControlTransferred = new eg.EventHandler();
            this.OnPingRequest = new eg.EventHandler();
            this.OnMapResize = new eg.EventHandler1<eg.Size2d>();

            this._connectionManager = new ServerConnectionManager(authCookieName);

            (<any>this.Proxy.invoke) = () => {
                if ((<any>this._connection).state === $.signalR.connectionState.connected) {
                    return savedProxyInvoke.apply(this.Proxy, arguments);
                }
            };
        }

        public Negotiate(): JQueryPromise<IClientInitialization> {
            var userInformation: IUserInformation = this._connectionManager.PrepareRegistration(),
                result: JQueryDeferred<IClientInitialization> = $.Deferred();

            this.Wire();

            this._connection.start().done(() => {
                this.TryInitialize(userInformation, (initialization: IClientInitialization) => {
                    initialization.UserInformation = userInformation;
                    this._payloadDecompressor = new PayloadDecompressor(initialization.CompressionContracts);

                    result.resolve(initialization);

                    this.Proxy.invoke("readyForPayloads");
                });
            });

            return result.promise();
        }

        public Stop(): void {
            this._connection.stop();
        }

        private TryInitialize(userInformation: IUserInformation, onComplete: (initialization: IClientInitialization) => void, count: number = 0): void {
            this.Proxy.invoke("initializeClient", userInformation.RegistrationID).done((initialization: IClientInitialization) => {
                if (!initialization) {
                    if (count >= ServerAdapter.NEGOTIATE_RETRIES) {
                        alert("Could not negotiate with server, please refresh the page.");
                    } else {
                        setTimeout(() => {
                            this.TryInitialize(userInformation, onComplete, count + 1);
                        }, ServerAdapter.RETRY_DELAY.Milliseconds);
                    }
                } else {
                    onComplete(initialization);
                }
            });
        }

        private Wire(): void {
            this.Proxy.on("d", (payload: any) => {
                this.OnPayload.Trigger(this._payloadDecompressor.Decompress(payload));
            });

            this.Proxy.on("l", (leaderboardUpdate: any) => {
                this.OnLeaderboardUpdate.Trigger(this._payloadDecompressor.DecompressLeaderboard(leaderboardUpdate));
            });

            this.Proxy.on("disconnect", () => {
                this.OnForcedDisconnct.Trigger();
            });

            this.Proxy.on("controlTransferred", () => {
                this.OnControlTransferred.Trigger();
            });

            this.Proxy.on("pingBack", () => {
                this.OnPingRequest.Trigger();
            });

            this.Proxy.on("mapSizeIncreased", (size: any) => {
                this.OnMapResize.Trigger(new eg.Size2d(size.Width, size.Height));
            });
        }
    }

}