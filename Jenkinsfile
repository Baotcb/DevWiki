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
                sh 'docker image prune -f'
            }
        }

        stage('Test: API (NestJS)') {
            when { expression { return !params.IS_ROLLBACK } }
            steps {
                echo "--- Chạy Unit Test cho devwiki-api ---"
                sh '''
                    docker run --rm \
                      --name devwiki-api-test-${BUILD_ID} \
                      -v "${WORKSPACE}/devwiki-api":/app \
                      -w /app \
                      ${NODE_IMAGE} \
                      sh -c "npm ci && npm test -- --passWithNoTests"
                '''
            }
        }

        stage('Test: Web (FE)') {
            when { expression { return !params.IS_ROLLBACK } }
            steps {
                echo "--- Lint & Type-check cho devwiki-web ---"
                sh '''
                    docker run --rm \
                      --name devwiki-web-test-${BUILD_ID} \
                      -v "${WORKSPACE}/devwiki-web":/app \
                      -w /app \
                      ${NODE_IMAGE} \
                      sh -c "npm ci && npm run lint"
                '''
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

        stage('Deploy to VM') {
            when { 
                expression { 
                    def branch = env.GIT_BRANCH ?: env.BRANCH_NAME ?: ''
                    return params.IS_ROLLBACK || branch == 'main' || branch == 'master' || branch == 'origin/main' || branch == 'origin/master'
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
            echo "🎉 Pipeline THÀNH CÔNG! Đang chạy phiên bản: ${params.IS_ROLLBACK ? params.ROLLBACK_VERSION : DOCKER_TAG}"
        }
        failure {
            echo "🔴 Pipeline THẤT BẠI. Kiểm tra lại logs trong Jenkins."
        }
    }
}