pipeline {
    agent any
    
    parameters {
        booleanParam(name: 'IS_ROLLBACK', defaultValue: false, description: 'Tích vào đây nếu muốn Rollback hệ thống')
        string(name: 'ROLLBACK_VERSION', defaultValue: '', description: 'Nhập tag  (Ví dụ: v42).Có tác dụng khi tích IS_ROLLBACK')
    }

    triggers {
        githubPush()
    }

    environment {
  
        IMAGE_API        = "devwiki-api"
        IMAGE_WEB        = "devwiki-web"
        DOCKER_TAG       = "v${env.BUILD_ID}"
        NODE_IMAGE       = 'node:20-alpine'
        DEPLOY_DIR       = '/opt/devwiki/deploy' 
    }

    stages {
        stage('Prepare') {
            steps {
                echo "=============================================="
                echo " DevWiki Local CI/CD Pipeline"  
                echo " Branch     : ${env.GIT_BRANCH}"
                echo " Build ID   : ${env.BUILD_ID}"
                echo " Rollback?  : ${params.IS_ROLLBACK}"
                echo "=============================================="
            }
        }


        stage('Build: Local Docker Images') {
            when { expression { return !params.IS_ROLLBACK } }
            parallel {
                stage('Build: devwiki-api') {
                    steps {
                        echo "--- Build image: ${IMAGE_API}:${DOCKER_TAG} ---"
                        sh """
                            docker build \
                              -t ${IMAGE_API}:${DOCKER_TAG} \
                              --label "build.id=${BUILD_ID}" \
                              devwiki-api/
                        """
                    }
                }
                stage('Build: devwiki-web') {
                    steps {
                        echo "--- Build image: ${IMAGE_WEB}:${DOCKER_TAG} ---"
                        sh """
                            docker build \
                              -t ${IMAGE_WEB}:${DOCKER_TAG} \
                              --label "build.id=${BUILD_ID}" \
                              devwiki-web/
                        """
                    }
                }
            }
        }

        stage('Validate Rollback Images') {
            when { expression { return params.IS_ROLLBACK } }
            steps {
                script {
                    if (params.ROLLBACK_VERSION == '') {
                        error("Báo lỗi: Bạn đã chọn Rollback nhưng không nhập ROLLBACK_VERSION!")
                    }

                    withEnv(["ROLLBACK_VERSION=${params.ROLLBACK_VERSION}"]) {
                        sh '''
                            set -eu

                            for IMAGE in "$IMAGE_API" "$IMAGE_WEB"; do
                                if ! docker image inspect "$IMAGE:$ROLLBACK_VERSION" >/dev/null 2>&1; then
                                    echo " Không tìm thấy image $IMAGE:$ROLLBACK_VERSION trên Docker host!"
                                    exit 1
                                fi
                            done

                            echo " Đã tìm thấy đủ image cho rollback: $ROLLBACK_VERSION"
                        '''
                    }
                }
            }
        }

        stage('Deploy to VM') {
            when { 
                expression { 
                    def branch = env.GIT_BRANCH ?: env.BRANCH_NAME ?: ''
                    return params.IS_ROLLBACK || branch in ['main', 'master', 'origin/main', 'origin/master']
                }
            }
            steps {
                script {
                    
                    def TARGET_VERSION = params.IS_ROLLBACK ? params.ROLLBACK_VERSION : DOCKER_TAG
                    
                    if (params.IS_ROLLBACK && TARGET_VERSION == '') {
                        error(" Báo lỗi: Bạn đã chọn Rollback nhưng không nhập ROLLBACK_VERSION!")
                    }

                    echo " Tiến hành khởi chạy version: ${TARGET_VERSION}"

                    withCredentials([
                        file(credentialsId: 'devwiki-api-env-file', variable: 'API_ENV_FILE'),
                        file(credentialsId: 'devwiki_deploy_env_file', variable: 'DEPLOY_ENV_FILE')
                    ]) {
                        withEnv(["TARGET_VERSION=${TARGET_VERSION}"]) {
                           sh '''
                                set -eu
                                mkdir -p "$DEPLOY_DIR"
                                cp "$WORKSPACE/docker-compose.yml" "$DEPLOY_DIR/docker-compose.yml"
                                mkdir -p "$DEPLOY_DIR/nginx"
                                cp "$WORKSPACE/nginx/nginx.conf" "$DEPLOY_DIR/nginx/nginx.conf"
                                cd "$DEPLOY_DIR"

                                cp "$API_ENV_FILE" api.env
                                chmod 600 api.env

                                cp "$DEPLOY_ENV_FILE" .env
                                chmod 600 .env
                                sed -i "s/^APP_VERSION=.*/APP_VERSION=$TARGET_VERSION/" .env

                                docker compose up -d

                                
                            '''
                        }
                    }
                }
            }
        }
    } 
    
    post {
        success {
            echo " Pipeline THÀNH CÔNG! Đang chạy phiên bản: ${params.IS_ROLLBACK ? params.ROLLBACK_VERSION : DOCKER_TAG}"
        }
        failure {
            echo " Pipeline THẤT BẠI. Kiểm tra lại logs trong Jenkins."
        }
    }
}