pipeline {
    agent any

    parameters {
        booleanParam(name: 'IS_ROLLBACK', defaultValue: false, description: 'Tich vao day neu muon Rollback he thong')
        booleanParam(name: 'USE_LATEST_ENV', defaultValue: false, description: 'Khi Rollback: tich vao day neu muon dung .env/api.env moi nhat thay vi ban cu cua version do')
        booleanParam(name: 'RESTORE_DATABASE', defaultValue: false, description: 'Khi Rollback: phuc hoi MongoDB tu backup da luu')
        string(name: 'ROLLBACK_VERSION', defaultValue: '', description: 'Nhap tag, vi du: v36')
        string(name: 'DATABASE_BACKUP_VERSION', defaultValue: '', description: 'Version backup MongoDB can phuc hoi, vi du: v36')
    }

    triggers {
        githubPush()
    }

    environment {
        IMAGE_API          = 'devwiki-api'
        IMAGE_WEB          = 'devwiki-web'
        DOCKER_TAG         = "v${env.BUILD_ID}"
        SSH_CREDENTIALS_ID = 'devwiki-target-ssh'
        DEPLOY_HOST_ID     = 'devwiki-deploy-host'
        DEPLOY_USER_ID     = 'devwiki-deploy-user'
        DEPLOY_DIR_ID      = 'devwiki-deploy-dir'
    }

    stages {
        stage('Prepare') {
            steps {
                echo "Build ${env.BUILD_ID}; deploy target configured in Jenkins Credentials; rollback=${params.IS_ROLLBACK}"
            }
        }

        stage('Build Docker Images') {
            when { expression { !params.IS_ROLLBACK } }
            parallel {
                stage('Build API') {
                    steps {
                        sh "docker build -t ${IMAGE_API}:${DOCKER_TAG} -t ${IMAGE_API}:latest --label build.id=${BUILD_ID} devwiki-api/"
                    }
                }
                stage('Build Web') {
                    steps {
                        sh "docker build -t ${IMAGE_WEB}:${DOCKER_TAG} -t ${IMAGE_WEB}:latest --label build.id=${BUILD_ID} devwiki-web/"
                    }
                }
            }
        }

        stage('Package Docker Images') {
            when { expression { !params.IS_ROLLBACK } }
            steps {
                sh '''
                    set -eu
                    docker save "$IMAGE_API:$DOCKER_TAG" | gzip > "$WORKSPACE/${IMAGE_API}-${DOCKER_TAG}.tar.gz"
                    docker save "$IMAGE_WEB:$DOCKER_TAG" | gzip > "$WORKSPACE/${IMAGE_WEB}-${DOCKER_TAG}.tar.gz"
                '''
            }
        }

        stage('Deploy To Target Server') {
            when {
                expression {
                    def branch = env.GIT_BRANCH ?: env.BRANCH_NAME ?: ''
                    return params.IS_ROLLBACK || branch in ['main', 'master', 'origin/main', 'origin/master']
                }
            }
            steps {
                script {
                    def targetVersion = params.IS_ROLLBACK ? params.ROLLBACK_VERSION : env.DOCKER_TAG
                    if (params.IS_ROLLBACK && !targetVersion?.trim()) {
                        error('Da chon Rollback nhung chua nhap ROLLBACK_VERSION')
                    }
                    if (params.RESTORE_DATABASE && !params.DATABASE_BACKUP_VERSION?.trim()) {
                        error('Da chon RESTORE_DATABASE nhung chua nhap DATABASE_BACKUP_VERSION')
                    }
                    if (params.RESTORE_DATABASE && !params.IS_ROLLBACK) {
                        error('RESTORE_DATABASE chi duoc dung khi IS_ROLLBACK=true')
                    }

                    withCredentials([
                        string(credentialsId: env.SSH_CREDENTIALS_ID, variable: 'SSH_PASSWORD'),
                        string(credentialsId: env.DEPLOY_HOST_ID, variable: 'DEPLOY_HOST'),
                        string(credentialsId: env.DEPLOY_USER_ID, variable: 'DEPLOY_USER'),
                        string(credentialsId: env.DEPLOY_DIR_ID, variable: 'DEPLOY_DIR'),
                        string(credentialsId: 'devwiki-api-port', variable: 'API_PORT'),
                        string(credentialsId: 'devwiki-api-jwt-secret', variable: 'API_JWT_SECRET'),
                        string(credentialsId: 'devwiki-api-jwt-expires-in', variable: 'API_JWT_EXPIRES_IN'),
                        string(credentialsId: 'devwiki-api-jwt-refresh-secret', variable: 'API_JWT_REFRESH_SECRET'),
                        string(credentialsId: 'devwiki-api-jwt-refresh-expires-in', variable: 'API_JWT_REFRESH_EXPIRES_IN'),
                        string(credentialsId: 'devwiki-mongo-username', variable: 'MONGO_USERNAME'),
                        string(credentialsId: 'devwiki-mongo-password', variable: 'MONGO_PASSWORD'),
                        string(credentialsId: 'devwiki-mongo-database', variable: 'MONGO_DATABASE')
                    ]) {
                        withEnv([
                            "TARGET_VERSION=${targetVersion}",
                            "ROLLBACK_MODE=${params.IS_ROLLBACK}",
                            "USE_LATEST_ENV=${params.USE_LATEST_ENV}",
                            "RESTORE_DATABASE=${params.RESTORE_DATABASE}",
                            "DATABASE_BACKUP_VERSION=${params.DATABASE_BACKUP_VERSION}"
                        ]) {
                        sh '''
                            set -eu

                            export SSHPASS="$SSH_PASSWORD"
                            SSH_OPTS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
                            REMOTE="$DEPLOY_USER@$DEPLOY_HOST"
                            REMOTE_RELEASE="$DEPLOY_DIR/releases/$TARGET_VERSION"

                            sshpass -e ssh $SSH_OPTS "$REMOTE" "mkdir -p '$REMOTE_RELEASE/nginx'"
                            sshpass -e scp $SSH_OPTS docker-compose.yml "$REMOTE:$REMOTE_RELEASE/docker-compose.yml"
                            sshpass -e scp $SSH_OPTS nginx/nginx.conf "$REMOTE:$REMOTE_RELEASE/nginx/nginx.conf"

                            if [ "$ROLLBACK_MODE" != "true" ]; then
                                {
                                    printf 'PORT=%s\n' "$API_PORT"
                                    printf 'JWT_SECRET=%s\n' "$API_JWT_SECRET"
                                    printf 'JWT_EXPIRES_IN=%s\n' "$API_JWT_EXPIRES_IN"
                                    printf 'JWT_REFRESH_SECRET=%s\n' "$API_JWT_REFRESH_SECRET"
                                    printf 'JWT_REFRESH_EXPIRES_IN=%s\n' "$API_JWT_REFRESH_EXPIRES_IN"
                                } | sshpass -e ssh $SSH_OPTS "$REMOTE" "cat > '$REMOTE_RELEASE/api.env'"
                                {
                                    printf 'APP_VERSION=%s\n' "$TARGET_VERSION"
                                    printf 'MONGO_USERNAME=%s\n' "$MONGO_USERNAME"
                                    printf 'MONGO_PASSWORD=%s\n' "$MONGO_PASSWORD"
                                    printf 'MONGO_DATABASE=%s\n' "$MONGO_DATABASE"
                                } | sshpass -e ssh $SSH_OPTS "$REMOTE" "cat > '$REMOTE_RELEASE/.env'"
                                sshpass -e scp $SSH_OPTS "$WORKSPACE/$IMAGE_API-$DOCKER_TAG.tar.gz" "$REMOTE:$REMOTE_RELEASE/"
                                sshpass -e scp $SSH_OPTS "$WORKSPACE/$IMAGE_WEB-$DOCKER_TAG.tar.gz" "$REMOTE:$REMOTE_RELEASE/"
                            elif [ "$USE_LATEST_ENV" = "true" ]; then
                                {
                                    printf 'PORT=%s\n' "$API_PORT"
                                    printf 'JWT_SECRET=%s\n' "$API_JWT_SECRET"
                                    printf 'JWT_EXPIRES_IN=%s\n' "$API_JWT_EXPIRES_IN"
                                    printf 'JWT_REFRESH_SECRET=%s\n' "$API_JWT_REFRESH_SECRET"
                                    printf 'JWT_REFRESH_EXPIRES_IN=%s\n' "$API_JWT_REFRESH_EXPIRES_IN"
                                } | sshpass -e ssh $SSH_OPTS "$REMOTE" "cat > '$REMOTE_RELEASE/api.env'"
                                {
                                    printf 'APP_VERSION=%s\n' "$TARGET_VERSION"
                                    printf 'MONGO_USERNAME=%s\n' "$MONGO_USERNAME"
                                    printf 'MONGO_PASSWORD=%s\n' "$MONGO_PASSWORD"
                                    printf 'MONGO_DATABASE=%s\n' "$MONGO_DATABASE"
                                } | sshpass -e ssh $SSH_OPTS "$REMOTE" "cat > '$REMOTE_RELEASE/.env'"
                            fi

                            sshpass -e ssh $SSH_OPTS "$REMOTE" bash -s -- "$TARGET_VERSION" "$ROLLBACK_MODE" "$DEPLOY_DIR" "$IMAGE_API" "$IMAGE_WEB" "${RESTORE_DATABASE:-false}" "${DATABASE_BACKUP_VERSION:-__NONE__}" <<'REMOTE_SCRIPT'
                            set -eu
                            TARGET_VERSION="$1"
                            ROLLBACK_MODE="$2"
                            DEPLOY_DIR="$3"
                            IMAGE_API="$4"
                            IMAGE_WEB="$5"
                            RESTORE_DATABASE="$6"
                            DATABASE_BACKUP_VERSION="$7"
                            if [ "$DATABASE_BACKUP_VERSION" = "__NONE__" ]; then
                                DATABASE_BACKUP_VERSION=""
                            fi
                            RELEASE_DIR="$DEPLOY_DIR/releases/$TARGET_VERSION"
                            BACKUP_DIR="/home/JenkinsDeployer/docker/backups/mongodb"

                            cd "$RELEASE_DIR"
                            chmod 600 api.env .env
                            sed -i "s/^APP_VERSION=.*/APP_VERSION=$TARGET_VERSION/" .env
                            set -a
                            . "$RELEASE_DIR/.env"
                            set +a

                            mkdir -p "$BACKUP_DIR"
                            MIGRATION_REQUIRED="false"
                            MIGRATION_BACKUP="$BACKUP_DIR/migration-$(date -u +%Y%m%d%H%M%S).archive.gz"
                            if ! docker volume inspect devwiki-mongodb-data >/dev/null 2>&1; then
                                docker start devwiki-mongodb >/dev/null 2>&1 || true
                                if [ "$(docker inspect -f '{{.State.Running}}' devwiki-mongodb 2>/dev/null || true)" = "true" ]; then
                                    docker exec devwiki-mongodb mongodump \
                                        --username "$MONGO_USERNAME" \
                                        --password "$MONGO_PASSWORD" \
                                        --authenticationDatabase admin \
                                        --db "$MONGO_DATABASE" \
                                        --archive --gzip > "$MIGRATION_BACKUP"
                                    MIGRATION_REQUIRED="true"
                                fi
                            fi

                            docker rm -f devwiki-mongodb devwiki-api devwiki-web devwiki-nginx 2>/dev/null || true
                            docker compose up -d mongodb

                            if [ "$MIGRATION_REQUIRED" = "true" ]; then
                                docker compose exec -T mongodb mongorestore \
                                    --username "$MONGO_USERNAME" \
                                    --password "$MONGO_PASSWORD" \
                                    --authenticationDatabase admin \
                                    --db "$MONGO_DATABASE" \
                                    --archive --gzip --drop < "$MIGRATION_BACKUP"
                            fi

                            if [ "$ROLLBACK_MODE" = "true" ] && [ "$RESTORE_DATABASE" = "true" ]; then
                                DATABASE_BACKUP="$BACKUP_DIR/$DATABASE_BACKUP_VERSION.archive.gz"
                                if [ ! -f "$DATABASE_BACKUP" ]; then
                                    echo "Missing database backup: $DATABASE_BACKUP"
                                    exit 1
                                fi

                                docker compose stop devwiki-api
                                docker compose exec -T mongodb mongorestore \
                                    --username "$MONGO_USERNAME" \
                                    --password "$MONGO_PASSWORD" \
                                    --authenticationDatabase admin \
                                    --db "$MONGO_DATABASE" \
                                    --archive --gzip --drop < "$DATABASE_BACKUP"
                            fi

                            if [ "$ROLLBACK_MODE" = "true" ]; then
                                for IMAGE in "$IMAGE_API" "$IMAGE_WEB"; do
                                    docker image inspect "$IMAGE:$TARGET_VERSION" >/dev/null 2>&1 || {
                                        echo "Missing rollback image: $IMAGE:$TARGET_VERSION"
                                        exit 1
                                    }
                                done
                            else
                                gunzip -c "$IMAGE_API-$TARGET_VERSION.tar.gz" | docker load
                                gunzip -c "$IMAGE_WEB-$TARGET_VERSION.tar.gz" | docker load
                            fi

                            ln -sfn "$RELEASE_DIR" "$DEPLOY_DIR/current"
                            cd "$DEPLOY_DIR/current"
                            docker compose up -d --remove-orphans

                            mkdir -p "$BACKUP_DIR"
                            BACKUP_NAME="$TARGET_VERSION"
                            if [ "$ROLLBACK_MODE" = "true" ]; then
                                BACKUP_NAME="rollback-$TARGET_VERSION-$(date -u +%Y%m%d%H%M%S)"
                            fi
                            docker compose exec -T mongodb mongodump \
                                --username "$MONGO_USERNAME" \
                                --password "$MONGO_PASSWORD" \
                                --authenticationDatabase admin \
                                --db "$MONGO_DATABASE" \
                                --archive --gzip > "$BACKUP_DIR/$BACKUP_NAME.archive.gz"
REMOTE_SCRIPT
                        '''
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            sh 'rm -f "$WORKSPACE"/devwiki-api-v*.tar.gz "$WORKSPACE"/devwiki-web-v*.tar.gz || true'
        }
        success {
            echo "Pipeline thanh cong: ${params.IS_ROLLBACK ? params.ROLLBACK_VERSION : DOCKER_TAG}"
        }
        failure {
            echo 'Pipeline that bai.'
        }
    }
}