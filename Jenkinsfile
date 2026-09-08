pipeline {
    agent any
    
    parameters {
        booleanParam(name: 'IS_ROLLBACK', defaultValue: false, description: 'Tích vào đây nếu muốn Rollback hệ thống')
        string(name: 'ROLLBACK_VERSION', defaultValue: '', description: 'Nhập tag muốn rollback (Ví dụ: v42). Chỉ có tác dụng khi tích IS_ROLLBACK')
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
                              -t ${IMAGE_API}:latest \
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
                              -t ${IMAGE_WEB}:latest \
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
                        error("❌ Báo lỗi: Bạn đã chọn Rollback nhưng không nhập ROLLBACK_VERSION!")
                    }

                    withEnv(["ROLLBACK_VERSION=${params.ROLLBACK_VERSION}"]) {
                        sh '''
                            set -eu

                            for IMAGE in "$IMAGE_API" "$IMAGE_WEB"; do
                                if ! docker image inspect "$IMAGE:$ROLLBACK_VERSION" >/dev/null 2>&1; then
                                    echo "❌ Không tìm thấy image $IMAGE:$ROLLBACK_VERSION trên Docker host!"
                                    exit 1
                                fi
                            done

                            echo "✅ Đã tìm thấy đủ image cho rollback: $ROLLBACK_VERSION"
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
                        error("❌ Báo lỗi: Bạn đã chọn Rollback nhưng không nhập ROLLBACK_VERSION!")
                    }

                    echo "🚀 Tiến hành khởi chạy version: ${TARGET_VERSION}"

                    withCredentials([
                        file(credentialsId: 'devwiki-api-env-file', variable: 'API_ENV_FILE'),
                        file(credentialsId: 'devwiki_deploy_env_file', variable: 'DEPLOY_ENV_FILE')
                    ]) {
                        withEnv(["TARGET_VERSION=${TARGET_VERSION}"]) {
                            sh '''
                                set -eu
                                test -f "$WORKSPACE/docker-compose.yml"
                                mkdir -p "$DEPLOY_DIR"
                                cp "$WORKSPACE/docker-compose.yml" "$DEPLOY_DIR/docker-compose.yml"
                                test -f "$DEPLOY_DIR/docker-compose.yml"
                                cd "$DEPLOY_DIR"
                                echo "Deploy directory: $(pwd)"
                                ls -l docker-compose.yml

                                cp "$API_ENV_FILE" api.env
                                chmod 600 api.env

                                cp "$DEPLOY_ENV_FILE" .env
                                chmod 600 .env
                                sed -i "s/^APP_VERSION=.*/APP_VERSION=$TARGET_VERSION/" .env

                                if docker compose version >/dev/null 2>&1; then
                                    docker compose up -d
                                elif command -v docker-compose >/dev/null 2>&1; then
                                    docker-compose up -d
                                else
                                    echo "Docker Compose chưa được cài hoặc không khả dụng trên Jenkins agent."
                                    echo "Cài Docker Compose v2 plugin hoặc docker-compose rồi chạy lại pipeline."
                                    exit 1
                                fi

                                for IMAGE in "$IMAGE_API" "$IMAGE_WEB"; do
                                    OLD_TAGS=$(docker image ls "$IMAGE" --format '{{.Tag}}' | grep -E '^v[0-9]+$' | sort -V -r | tail -n +6 || true)

                                    for TAG in $OLD_TAGS; do
                                        if [ "$TAG" != "$TARGET_VERSION" ]; then
                                            docker image rm "$IMAGE:$TAG" || true
                                        fi
                                    done
                                done
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