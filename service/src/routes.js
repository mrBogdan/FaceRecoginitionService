import DeviceDetector from 'device-detector-js';

import {addRoute} from './router.js';
import {HTTP_METHODS, TIME_IN_MS} from './constants.js';
import {
    createUserController,
    createUserRepository,
    createUserService,
    UserAlreadyExistsError,
    UserNotFoundError,
} from './user/index.js';
import {signInSchema, signUpSchema} from './schemas/index.js';
import {HEADERS} from './headers.js';
import {sendLoginEvent} from './analytics/index.js';

const getRequestBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => body += chunk);
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
    });
};

export const routes = ({postgres, analytics}) => {
    addRoute(HTTP_METHODS.GET, '/presto-chart', async (req, res) => {
        const chartData = {
            labels: labels,
            datasets: [
                {
                    label: 'Successful Logins',
                    data: successfulData,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Failed Logins',
                    data: failedData,
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        };
    });

    addRoute(HTTP_METHODS.GET, '/', (req, res) => {
        res.writeHead(200, HEADERS.ContentType);
        res.end('OK');
    });

    addRoute(HTTP_METHODS.GET, '/health', (req, res) => {
        res.writeHead(200, HEADERS.ContentType);
        res.end(JSON.stringify({ message: 'Healthy' }));
    });

    addRoute(HTTP_METHODS.POST, '/sign-in', async (req, res) => {
        const repository = createUserRepository(postgres);
        const service = createUserService(repository);
        const controller = createUserController(service);
        const body = await getRequestBody(req);

        const result = signInSchema.validate(body);

        if (result.error) {
            res.writeHead(400, HEADERS.ContentType);
            res.end(JSON.stringify({ error: result.error.details }));
            return;
        }

        try {
            const {accessToken, user} = await controller.signIn(body);
            const deviceDetector = new DeviceDetector();
            const userAgent = deviceDetector.parse(req.headers['user-agent']);
            await sendLoginEvent(analytics, {
                userId: user.id,
                location: body.locations,
                device: {
                    deviceType: userAgent.device.type,
                    deviceName: userAgent.device.model,
                    osName: userAgent.os.name,
                    osVersion: userAgent.os.version,
                },
                session: {
                    userId: user.id,
                    createdAt: new Date(),
                    expiredAt: new Date(Date.now() + TIME_IN_MS.MIN * 15),
                },
                success: true,
            });

            res.writeHead(200, HEADERS.ContentType);
            res.end(JSON.stringify(accessToken));
        } catch (error) {
            if (error instanceof UserNotFoundError) {
                res.writeHead(404, HEADERS.ContentType);
                res.end(JSON.stringify({ message: error.message }));
                return;
            }

            console.error(error);
            res.writeHead(500, HEADERS.ContentType);
            res.end(JSON.stringify({ message: error.message }));
            return;
        }

    });

    addRoute(HTTP_METHODS.POST, '/sign-up', async (req, res) => {
        const repository = createUserRepository(postgres);
        const service = createUserService(repository);
        const controller = createUserController(service);
        const body = await getRequestBody(req);
        const result = signUpSchema.validate(body);
        if (result.error) {
            res.writeHead(400, HEADERS.ContentType);
            res.end(JSON.stringify({ error: result.error.details }));
            return;
        }
        try {
            await controller.createUser(body);
            res.writeHead(201, HEADERS.ContentType);
            res.end(JSON.stringify({ message: 'created' }));
        } catch (error) {
            if (error instanceof UserAlreadyExistsError) {
                res.writeHead(409, HEADERS.ContentType);
                res.end(JSON.stringify({ message: error.message }));
                return;
            }
            throw error;
        }


    });

}
