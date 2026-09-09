pipeline {
    agent any

    parameters {
        booleanParam(name: 'IS_ROLLBACK', defaultValue: false, description: 'Tich vao day neu muon Rollback he thong')
        string(name: 'ROLLBACK_VERSION', defaultValue: '', description: 'Nhap tag, vi du: v42')
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
                        sh "docker build -t ${IMAGE_API}:${DOCKER_TAG} --label build.id=${BUILD_ID} devwiki-api/"
                    }
                }
                stage('Build Web') {
                    steps {
                        sh "docker build -t ${IMAGE_WEB}:${DOCKER_TAG} --label build.id=${BUILD_ID} devwiki-web/"
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

                    withCredentials([
                        string(credentialsId: env.SSH_CREDENTIALS_ID, variable: 'SSH_PASSWORD'),
                        string(credentialsId: env.DEPLOY_HOST_ID, variable: 'DEPLOY_HOST'),
                        string(credentialsId: env.DEPLOY_USER_ID, variable: 'DEPLOY_USER'),
                        string(credentialsId: env.DEPLOY_DIR_ID, variable: 'DEPLOY_DIR'),
                        file(credentialsId: 'devwiki-api-env-file', variable: 'API_ENV_FILE'),
                        file(credentialsId: 'devwiki_deploy_env_file', variable: 'DEPLOY_ENV_FILE')
                    ]) {
                        withEnv([
                            "TARGET_VERSION=${targetVersion}",
                            "ROLLBACK_MODE=${params.IS_ROLLBACK}"
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
                                sshpass -e scp $SSH_OPTS "$API_ENV_FILE" "$REMOTE:$REMOTE_RELEASE/api.env"
                                sshpass -e scp $SSH_OPTS "$DEPLOY_ENV_FILE" "$REMOTE:$REMOTE_RELEASE/.env"

                                if [ "$ROLLBACK_MODE" != "true" ]; then
                                    sshpass -e scp $SSH_OPTS "$WORKSPACE/$IMAGE_API-$DOCKER_TAG.tar.gz" "$REMOTE:$REMOTE_RELEASE/"
                                    sshpass -e scp $SSH_OPTS "$WORKSPACE/$IMAGE_WEB-$DOCKER_TAG.tar.gz" "$REMOTE:$REMOTE_RELEASE/"
                                fi

                                sshpass -e ssh $SSH_OPTS "$REMOTE" bash -s -- "$TARGET_VERSION" "$ROLLBACK_MODE" "$DEPLOY_DIR" "$IMAGE_API" "$IMAGE_WEB" <<'REMOTE_SCRIPT'
                                set -eu
                                TARGET_VERSION="$1"
                                ROLLBACK_MODE="$2"
                                DEPLOY_DIR="$3"
                                IMAGE_API="$4"
                                IMAGE_WEB="$5"
                                RELEASE_DIR="$DEPLOY_DIR/releases/$TARGET_VERSION"

                                cd "$RELEASE_DIR"
                                chmod 600 api.env .env
                                sed -i "s/^APP_VERSION=.*/APP_VERSION=$TARGET_VERSION/" .env

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
            echo 'Pipeline that bai. Kiem tra log Jenkins va server dich.'
        }
    }
}